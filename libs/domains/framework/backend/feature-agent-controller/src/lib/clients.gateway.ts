import { BadRequestException, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type { Socket as ClientSocket } from 'socket.io-client';
import { AuthenticationType } from './entities/client.entity';
import { ClientAgentCredentialsRepository } from './repositories/client-agent-credentials.repository';
import { ClientsRepository } from './repositories/clients.repository';
import { ClientsService } from './services/clients.service';
// socket.io-client is required at runtime when forwarding; avoid static import to keep optional dependency for tests
// Using type-only import for ClientSocket to avoid runtime dependency

interface SetClientPayload {
  clientId: string;
}

interface ForwardPayload {
  event: string;
  payload: unknown;
  agentId?: string;
}

@WebSocketGateway(parseInt(process.env.WEBSOCKET_PORT || '8081'), {
  namespace: 'clients',
  cors: { origin: '*' },
})
export class ClientsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ClientsGateway.name);

  // Maps socket.id to selected clientId
  private selectedClientBySocket = new Map<string, string>();
  // Maps socket.id to remote socket connection (client's agent WS)
  // Using ClientSocket type from socket.io-client (type-only import to avoid runtime dependency)
  private remoteSocketBySocket = new Map<string, ClientSocket>();
  // Track which agentIds are logged-in per socket (avoid repeated logins)
  private loggedInAgentsBySocket = new Map<string, Set<string>>();

  constructor(
    private readonly clientsService: ClientsService,
    private readonly clientsRepository: ClientsRepository,
    private readonly clientAgentCredentialsRepository: ClientAgentCredentialsRepository,
  ) {}

  handleConnection(socket: Socket): void {
    this.logger.log(`Client connected: ${socket.id}`);
  }

  handleDisconnect(socket: Socket): void {
    this.logger.log(`Client disconnected: ${socket.id}`);
    this.selectedClientBySocket.delete(socket.id);
    const remote = this.remoteSocketBySocket.get(socket.id);
    if (remote) {
      try {
        remote.removeAllListeners();
        remote.disconnect();
      } catch {
        // ignore
      }
      this.remoteSocketBySocket.delete(socket.id);
    }
    this.loggedInAgentsBySocket.delete(socket.id);
  }

  /**
   * Handle client context setup.
   * SECURITY: All responses (setClientSuccess, error) are sent only to the initiating socket.
   * Each socket gets its own isolated remote connection to the agent-manager gateway.
   * @param data - SetClient payload containing clientId
   * @param socket - The socket instance making the request
   */
  @SubscribeMessage('setClient')
  async handleSetClient(@MessageBody() data: SetClientPayload, @ConnectedSocket() socket: Socket) {
    const clientId = data?.clientId;
    if (!clientId) {
      // SECURITY: Error sent only to the initiating socket, not broadcast
      socket.emit('error', { message: 'clientId is required' });
      return;
    }
    try {
      const client = await this.clientsRepository.findByIdOrThrow(clientId as string);
      this.selectedClientBySocket.set(socket.id, clientId);
      // establish remote socket connection to the client's agents namespace
      const authHeader = await this.getAuthHeader(clientId);
      const remoteUrl = this.buildAgentsWsUrl(client.endpoint, client.agentWsPort);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { io } = require('socket.io-client');
      const remote = io(remoteUrl, {
        transports: ['websocket'],
        extraHeaders: { Authorization: authHeader },
      });
      // Wire remote->local: forward application events back to the original socket
      // SECURITY: Each remote socket connection is isolated to its specific local socket via closure.
      // Events from the remote socket are only forwarded to the local socket that owns this remote connection.
      // This ensures agent-specific messages are only received by clients authenticated to that agent.
      // Filter out Socket.IO internal connection events to prevent connection issues
      const internalEvents = new Set([
        'connect',
        'disconnect',
        'connect_error',
        'reconnect',
        'reconnect_attempt',
        'reconnecting',
        'reconnect_error',
        'reconnect_failed',
        'ping',
        'pong',
      ]);
      // Handle Socket.IO internal error events separately (don't forward to avoid disconnection)
      // Internal errors are Error instances, application errors are plain objects
      remote.on('error', () => {
        // Don't forward - this is a Socket.IO internal error
      });
      remote.onAny((event, ...args) => {
        // SECURITY: The 'socket' variable is captured from the closure, ensuring events are only
        // forwarded to the specific local socket that initiated this remote connection.
        // This maintains isolation between different client connections.
        // For 'error' events, check if it's an internal Socket.IO error (Error instance)
        // vs application-level error (plain object from agents gateway)
        if (event === 'error' && args.length > 0 && args[0] instanceof Error) {
          return;
        }
        // Only forward application-level events, not Socket.IO internal events
        if (!internalEvents.has(event)) {
          // Check connection state before emitting (matches agents.gateway.ts pattern)
          if (!socket.connected) {
            return;
          }
          try {
            // SECURITY: Emit only to the specific local socket (not broadcast to all clients)
            socket.emit(event, ...args);
          } catch (emitError) {
            this.logger.error(`Failed to emit event '${event}' to local socket ${socket.id}: ${emitError}`);
            // Don't rethrow - let the connection continue
          }
        }
      });
      remote.on('connect_error', (err: Error) => {
        this.logger.warn(`Remote connection error for socket ${socket.id}: ${err.message}`);
        if (socket.connected) {
          try {
            socket.emit('error', { message: `Remote connection error: ${err.message}` });
          } catch {
            // Ignore if socket disconnected during emit
          }
        }
      });
      remote.on('disconnect', () => {
        // Remote disconnected - log but don't disconnect local socket
        // This allows the local socket to remain connected even if remote disconnects
      });
      this.remoteSocketBySocket.set(socket.id, remote);
      // Wait for remote connection to be established before emitting setClientSuccess
      // SECURITY: setClientSuccess is sent only to the initiating socket
      // Check if already connected (socket.io-client can connect synchronously in some cases)
      if (remote.connected) {
        socket.emit('setClientSuccess', { message: 'Client context set', clientId });
      } else {
        remote.once('connect', () => {
          // SECURITY: Success event sent only to the initiating socket
          socket.emit('setClientSuccess', { message: 'Client context set', clientId });
        });
        remote.once('connect_error', (err: Error) => {
          this.logger.warn(`Remote connection failed for socket ${socket.id}: ${err.message}`);
          if (socket.connected) {
            try {
              // SECURITY: Error sent only to the initiating socket
              socket.emit('error', { message: `Remote connection failed: ${err.message}` });
            } catch {
              // Ignore if socket disconnected during emit
            }
          }
        });
      }
    } catch (err) {
      const message = (err as { message?: string }).message || 'Failed to set client';
      // SECURITY: Error sent only to the initiating socket
      socket.emit('error', { message });
    }
  }

  /**
   * Forward generic events to the selected client agent-manager WebSocket.
   * SECURITY: All responses (forwardAck, error) are sent only to the initiating socket.
   * Agent-specific messages from the remote socket are forwarded only to the local socket
   * that owns the remote connection, maintaining isolation between client connections.
   * @param data - Forward payload containing event, payload, and optional agentId
   * @param socket - The socket instance making the request
   */
  @SubscribeMessage('forward')
  async handleForward(@MessageBody() data: ForwardPayload, @ConnectedSocket() socket: Socket) {
    const clientId = this.selectedClientBySocket.get(socket.id);
    if (!clientId) {
      // SECURITY: Error sent only to the initiating socket
      socket.emit('error', { message: 'No client selected. Call setClient first.' });
      return;
    }
    const remote = this.remoteSocketBySocket.get(socket.id);
    if (!remote || remote.disconnected) {
      // SECURITY: Error sent only to the initiating socket
      socket.emit('error', { message: 'Remote connection not established' });
      return;
    }
    try {
      const { event, payload } = data || ({} as ForwardPayload);
      if (!event) {
        throw new BadRequestException('event is required');
      }
      const agentId = data?.agentId;
      let loggedIn = this.loggedInAgentsBySocket.get(socket.id);
      if (!loggedIn) {
        loggedIn = new Set<string>();
        this.loggedInAgentsBySocket.set(socket.id, loggedIn);
      }

      // Special handling for "login" event with agentId: always override payload with credentials
      // SECURITY: Login success/error events are handled via remote.once() listeners and forwarded
      // only to the local socket that initiated the login, maintaining isolation.
      if (event === 'login' && agentId) {
        const creds = await this.clientAgentCredentialsRepository.findByClientAndAgent(clientId, agentId);
        if (!creds?.password) {
          // SECURITY: Error sent only to the initiating socket
          socket.emit('error', { message: `No stored credentials for agent ${agentId}` });
          return;
        }
        // Always override payload with credentials from database, regardless of login status
        const loginPayload = { agentId, password: creds.password };
        // Wait for login to complete
        await new Promise<void>((resolve, reject) => {
          const loginTimeout = setTimeout(() => {
            remote.off('loginSuccess', onLoginSuccess);
            remote.off('loginError', onLoginError);
            reject(new Error('Login timeout'));
          }, 5000);

          const onLoginSuccess = () => {
            clearTimeout(loginTimeout);
            remote.off('loginSuccess', onLoginSuccess);
            remote.off('loginError', onLoginError);
            loggedIn.add(agentId);
            resolve();
          };

          const onLoginError = (errorData: unknown) => {
            clearTimeout(loginTimeout);
            remote.off('loginSuccess', onLoginSuccess);
            remote.off('loginError', onLoginError);
            const error = errorData as { error?: { message?: string } };
            reject(new Error(error?.error?.message || 'Login failed'));
          };

          remote.once('loginSuccess', onLoginSuccess);
          remote.once('loginError', onLoginError);
          remote.emit('login', loginPayload);
        });
        // Login event already emitted, don't forward again
        // SECURITY: Acknowledgement sent only to the initiating socket
        socket.emit('forwardAck', { received: true, event });
        return;
      }

      // Auto-login for other events if agentId is provided and not yet logged in
      if (agentId && !loggedIn.has(agentId)) {
        const creds = await this.clientAgentCredentialsRepository.findByClientAndAgent(clientId, agentId);
        if (creds?.password) {
          // Wait for login to complete before emitting the event
          await new Promise<void>((resolve, reject) => {
            const loginTimeout = setTimeout(() => {
              remote.off('loginSuccess', onLoginSuccess);
              remote.off('loginError', onLoginError);
              reject(new Error('Login timeout'));
            }, 5000);

            const onLoginSuccess = () => {
              clearTimeout(loginTimeout);
              remote.off('loginSuccess', onLoginSuccess);
              remote.off('loginError', onLoginError);
              loggedIn.add(agentId);
              resolve();
            };

            const onLoginError = (errorData: unknown) => {
              clearTimeout(loginTimeout);
              remote.off('loginSuccess', onLoginSuccess);
              remote.off('loginError', onLoginError);
              const error = errorData as { error?: { message?: string } };
              reject(new Error(error?.error?.message || 'Login failed'));
            };

            remote.once('loginSuccess', onLoginSuccess);
            remote.once('loginError', onLoginError);
            remote.emit('login', { agentId, password: creds.password });
          });
        } else {
          this.logger.warn(`No stored credentials for client ${clientId}, agent ${agentId}; skipping auto-login`);
        }
      }
      remote.emit(event, payload);
      // SECURITY: Acknowledgement sent only to the initiating socket
      socket.emit('forwardAck', { received: true, event });
    } catch (error) {
      const message = (error as { message?: string }).message || 'Forwarding failed';
      // SECURITY: Error sent only to the initiating socket
      socket.emit('error', { message });
    }
  }

  private async getAuthHeader(clientId: string): Promise<string> {
    const client = await this.clientsRepository.findByIdOrThrow(clientId);
    if (client.authenticationType === AuthenticationType.API_KEY) {
      if (!client.apiKey) throw new BadRequestException('API key not configured for client');
      return `Bearer ${client.apiKey}`;
    }
    if (client.authenticationType === AuthenticationType.KEYCLOAK) {
      const token = await this.clientsService.getAccessToken(clientId);
      return `Bearer ${token}`;
    }
    throw new BadRequestException(`Unsupported authentication type`);
  }

  private buildAgentsWsUrl(endpoint: string, overridePort?: number): string {
    const url = new URL(endpoint);
    const effectivePort = (overridePort && String(overridePort)) || process.env.CLIENTS_REMOTE_WS_PORT || '8080';
    // Use HTTP(S) scheme for Socket.IO client, not WS(S)
    const protocol = url.protocol === 'https:' ? 'https' : 'http';
    const host = url.hostname;
    return `${protocol}://${host}:${effectivePort}/agents`;
  }
}
