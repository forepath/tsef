import { Logger } from '@nestjs/common';
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
import { AgentsRepository } from './repositories/agents.repository';
import { AgentsService } from './services/agents.service';
import { DockerService } from './services/docker.service';

interface LoginPayload {
  agentId: string;
  password: string;
}

interface ChatPayload {
  message: string;
}

/**
 * WebSocket gateway for agent chat functionality.
 * Handles WebSocket connections, authentication, and chat message broadcasting.
 * Authenticates sessions exclusively against the database-backed agent management system.
 */
@WebSocketGateway(parseInt(process.env.WEBSOCKET_PORT || '8080'), {
  namespace: 'agents',
  cors: {
    origin: '*', // adjust for production
  },
})
export class AgentsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AgentsGateway.name);

  // Store authenticated agents by socket.id
  // Maps socket.id -> agent UUID
  private authenticatedClients = new Map<string, string>();
  // Track log streaming tasks per socket
  private logStreamCancel = new Map<string, () => void>();
  // Track log streaming promises per socket for proper error handling
  private logStreamPromises = new Map<string, Promise<void>>();

  constructor(
    private readonly agentsService: AgentsService,
    private readonly agentsRepository: AgentsRepository,
    private readonly dockerService: DockerService,
  ) {}

  /**
   * Handle client connection.
   * @param socket - The connected socket instance
   */
  handleConnection(socket: Socket) {
    this.logger.log(`Client connected: ${socket.id}`);
  }

  /**
   * Handle client disconnection.
   * Cleans up authenticated session.
   * @param socket - The disconnected socket instance
   */
  handleDisconnect(socket: Socket) {
    this.logger.log(`Client disconnected: ${socket.id}`);
    this.authenticatedClients.delete(socket.id);
    const cancel = this.logStreamCancel.get(socket.id);
    if (cancel) {
      try {
        cancel();
      } catch (_e) {
        // ignore
      }
      this.logStreamCancel.delete(socket.id);
    }
    // Clean up promise tracking
    this.logStreamPromises.delete(socket.id);
  }

  /**
   * Find an agent by UUID or name.
   * Attempts UUID lookup first, then falls back to name lookup.
   * @param identifier - Agent UUID or name
   * @returns Agent UUID if found, null otherwise
   */
  private async findAgentIdByIdentifier(identifier: string): Promise<string | null> {
    // Try UUID lookup first
    const agentById = await this.agentsRepository.findById(identifier);
    if (agentById) {
      return agentById.id;
    }

    // Fallback to name lookup
    const agentByName = await this.agentsRepository.findByName(identifier);
    if (agentByName) {
      return agentByName.id;
    }

    return null;
  }

  /**
   * Handle agent login authentication.
   * Authenticates against database-backed agent management system.
   * @param data - Login payload containing agentId (UUID or name) and password
   * @param socket - The socket instance making the request
   */
  @SubscribeMessage('login')
  async handleLogin(@MessageBody() data: LoginPayload, @ConnectedSocket() socket: Socket) {
    const { agentId, password } = data;

    try {
      // Find agent by UUID or name
      const agentUuid = await this.findAgentIdByIdentifier(agentId);
      if (!agentUuid) {
        socket.emit('loginError', { message: 'Invalid credentials' });
        this.logger.warn(`Failed login attempt: agent not found (${agentId})`);
        return;
      }

      // Verify credentials
      const isValid = await this.agentsService.verifyCredentials(agentUuid, password);
      if (!isValid) {
        socket.emit('loginError', { message: 'Invalid credentials' });
        this.logger.warn(`Failed login attempt: invalid password for agent ${agentUuid}`);
        return;
      }

      // Store authenticated session
      this.authenticatedClients.set(socket.id, agentUuid);

      // Get agent details for welcome message
      const agent = await this.agentsService.findOne(agentUuid);
      socket.emit('loginSuccess', { message: `Welcome, ${agent.name}!` });
      this.logger.log(`Agent ${agent.name} (${agentUuid}) authenticated on socket ${socket.id}`);

      // Stream container logs to this socket
      try {
        const entity = await this.agentsRepository.findById(agentUuid);
        const containerId = entity?.containerId;
        if (containerId) {
          let cancelled = false;
          const cancel = () => {
            cancelled = true;
          };
          this.logStreamCancel.set(socket.id, cancel);

          // Create and track the log streaming promise
          const logStreamPromise = (async () => {
            try {
              for await (const line of this.dockerService.getContainerLogs(containerId)) {
                if (cancelled) break;
                // Emit only to this socket
                socket.emit('containerLog', { text: line });
              }
              // Stream completed normally (container stopped or cancelled)
              if (!cancelled) {
                this.logger.log(`Log stream completed for socket ${socket.id}`);
              }
            } catch (e) {
              // Handle streaming errors and notify client
              const err = e as { message?: string; stack?: string };
              this.logger.error(`Log stream error for socket ${socket.id}: ${err.message}`, err.stack);

              // Notify client about the error
              if (socket.connected) {
                socket.emit('logStreamError', {
                  message: 'Log streaming failed',
                  error: err.message,
                });
              }

              // Clean up on error
              this.logStreamCancel.delete(socket.id);
            }
          })();

          // Store promise for tracking and proper error handling
          this.logStreamPromises.set(socket.id, logStreamPromise);

          // Handle promise rejection to prevent unhandled rejection warnings
          logStreamPromise.catch((e) => {
            // Error already handled in the promise body
            // This catch is just to prevent unhandled rejection warnings
            const err = e as { message?: string };
            this.logger.debug(`Log stream promise rejected for socket ${socket.id}: ${err.message}`);
          });
        }
      } catch (e) {
        const err = e as { message?: string; stack?: string };
        this.logger.error(`Failed to start log streaming: ${err.message}`, err.stack);
        // Notify client if we failed to start streaming
        if (socket.connected) {
          socket.emit('logStreamError', {
            message: 'Failed to start log streaming',
            error: err.message,
          });
        }
      }
    } catch (error) {
      socket.emit('loginError', { message: 'Invalid credentials' });
      const err = error as { message?: string; stack?: string };
      this.logger.error(`Login error for agent ${agentId}: ${err.message}`, err.stack);
    }
  }

  /**
   * Handle chat message broadcasting.
   * Only authenticated agents can send messages.
   * @param data - Chat payload containing message text
   * @param socket - The socket instance making the request
   */
  @SubscribeMessage('chat')
  async handleChat(@MessageBody() data: ChatPayload, @ConnectedSocket() socket: Socket) {
    const agentUuid = this.authenticatedClients.get(socket.id);
    if (!agentUuid) {
      socket.emit('error', { message: 'Unauthorized. Please login first.' });
      return;
    }

    const message = data.message?.trim();
    if (!message) {
      return;
    }

    try {
      // Get agent details for display
      const agent = await this.agentsService.findOne(agentUuid);
      this.logger.log(`Agent ${agent.name} (${agentUuid}) says: ${message}`);
      this.server.emit('chatMessage', { from: agent.name, text: message });

      // Forward message to the agent's container stdin
      const entity = await this.agentsRepository.findById(agentUuid);
      const containerId = entity?.containerId;
      if (containerId) {
        // Command to execute: cursor-agent with prompt mode and JSON output
        const command = `cursor-agent -p --output-format json --resume ${agent.id}-${containerId}`;
        // Send the message to STDIN of the command
        await this.dockerService.sendCommandToContainer(containerId, command, message);
      }
    } catch (error) {
      socket.emit('error', { message: 'Error processing chat message' });
      const err = error as { message?: string; stack?: string };
      this.logger.error(`Chat error for agent ${agentUuid}: ${err.message}`, err.stack);
    }
  }
}
