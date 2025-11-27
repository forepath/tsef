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
import { AgentProviderFactory } from './providers/agent-provider.factory';
import { AgentsRepository } from './repositories/agents.repository';
import { AgentMessagesService } from './services/agent-messages.service';
import { AgentsService } from './services/agents.service';
import { DockerService } from './services/docker.service';

interface LoginPayload {
  agentId: string;
  password: string;
}

interface ChatPayload {
  model?: string;
  message: string;
}

interface FileUpdatePayload {
  filePath: string;
}

interface CreateTerminalPayload {
  sessionId?: string;
  shell?: string;
}

interface TerminalInputPayload {
  sessionId: string;
  data: string;
}

interface CloseTerminalPayload {
  sessionId: string;
}

enum ChatActor {
  AGENT = 'agent',
  USER = 'user',
}

/**
 * Standardized WebSocket response interfaces following best practices.
 * All responses include a timestamp for debugging and traceability.
 */

interface BaseResponse {
  timestamp: string;
}

interface SuccessResponse<T = unknown> extends BaseResponse {
  success: true;
  data: T;
}

interface ErrorResponse extends BaseResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: string;
  };
}

// Specific response types
interface LoginSuccessData {
  message: string;
  agentId: string;
  agentName: string;
}

interface LogoutSuccessData {
  message: string;
  agentId: string | null;
  agentName: string | null;
}

interface AgentResponseObject {
  type: string;
  subtype?: string;
  is_error?: boolean;
  duration_ms?: number;
  duration_api_ms?: number;
  result?: string;
  session_id?: string;
  request_id?: string;
  [key: string]: unknown; // Allow additional properties
}

interface UserChatMessageData {
  from: ChatActor.USER;
  text: string;
  timestamp: string;
}

interface AgentChatMessageData {
  from: ChatActor.AGENT;
  response: AgentResponseObject | string; // Parsed JSON object or raw string if parsing fails
  timestamp: string;
}

type ChatMessageData = UserChatMessageData | AgentChatMessageData;

interface FileUpdateNotificationData {
  socketId: string;
  filePath: string;
  timestamp: string;
}

// Helper functions to create standardized responses
const createSuccessResponse = <T>(data: T): SuccessResponse<T> => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
});

const createErrorResponse = (message: string, code?: string, details?: string): ErrorResponse => ({
  success: false,
  error: {
    message,
    ...(code && { code }),
    ...(details && { details }),
  },
  timestamp: new Date().toISOString(),
});

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
  // Store socket references by socket.id for reliable broadcasting
  // Maps socket.id -> Socket instance
  private socketById = new Map<string, Socket>();
  // Store terminal sessions: socket.id + sessionId -> sessionId
  // This ensures terminal sessions are client-specific (socket.id based)
  private terminalSessionsBySocket = new Map<string, Set<string>>();
  // Track agents that have received their first initialization message
  // Maps agent UUID -> boolean (true if initialization message was sent)
  private agentsWithFirstMessageSent = new Set<string>();
  // Track stats intervals per agent UUID
  // Maps agent UUID -> NodeJS.Timeout
  private statsIntervalsByAgent = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly agentsService: AgentsService,
    private readonly agentsRepository: AgentsRepository,
    private readonly dockerService: DockerService,
    private readonly agentMessagesService: AgentMessagesService,
    private readonly agentProviderFactory: AgentProviderFactory,
  ) {}

  /**
   * Handle client connection.
   * @param socket - The connected socket instance
   */
  handleConnection(socket: Socket) {
    this.logger.log(`Client connected: ${socket.id}`);
    // Store socket reference for reliable broadcasting
    this.socketById.set(socket.id, socket);
  }

  /**
   * Handle client disconnection.
   * Cleans up authenticated session and socket reference.
   * @param socket - The disconnected socket instance
   */
  handleDisconnect(socket: Socket) {
    this.logger.log(`Client disconnected: ${socket.id}`);
    const agentUuid = this.authenticatedClients.get(socket.id);
    this.authenticatedClients.delete(socket.id);
    this.socketById.delete(socket.id);
    // Clean up all terminal sessions for this socket
    const sessionIds = this.terminalSessionsBySocket.get(socket.id);
    if (sessionIds) {
      for (const sessionId of sessionIds) {
        try {
          this.dockerService.closeTerminalSession(sessionId);
        } catch (error) {
          const err = error as { message?: string };
          this.logger.warn(`Failed to close terminal session ${sessionId} on disconnect: ${err.message}`);
        }
      }
      this.terminalSessionsBySocket.delete(socket.id);
    }
    // Clean up stats interval if this was the last socket for this agent
    if (agentUuid) {
      this.cleanupStatsIntervalIfNeeded(agentUuid);
    }
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
   * Broadcast a message to all clients authenticated to a specific agent.
   * This ensures agent-specific messages are only sent to clients logged into that agent.
   * @param agentUuid - The UUID of the agent
   * @param event - The event name to emit
   * @param data - The data to send
   */
  private broadcastToAgent(agentUuid: string, event: string, data: unknown): void {
    // Find all socket IDs authenticated to this agent
    const socketIds: string[] = [];
    for (const [socketId, authenticatedAgentUuid] of this.authenticatedClients.entries()) {
      if (authenticatedAgentUuid === agentUuid) {
        socketIds.push(socketId);
      }
    }

    // Emit to each authenticated socket using stored socket references
    let successCount = 0;
    for (const socketId of socketIds) {
      const socket = this.socketById.get(socketId);
      if (socket && socket.connected) {
        try {
          socket.emit(event, data);
          successCount++;
        } catch (emitError) {
          this.logger.warn(`Failed to emit ${event} to socket ${socketId}: ${emitError}`);
          // Remove stale socket reference if emit fails
          this.socketById.delete(socketId);
        }
      } else if (socket && !socket.connected) {
        // Clean up disconnected socket reference
        this.socketById.delete(socketId);
        this.authenticatedClients.delete(socketId);
      }
    }

    if (successCount > 0) {
      this.logger.debug(`Broadcasted ${event} to ${successCount} client(s) for agent ${agentUuid}`);
    }
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
        socket.emit('loginError', createErrorResponse('Invalid credentials', 'INVALID_CREDENTIALS'));
        this.logger.warn(`Failed login attempt: agent not found (${agentId})`);
        return;
      }

      // Verify credentials
      const isValid = await this.agentsService.verifyCredentials(agentUuid, password);
      if (!isValid) {
        socket.emit('loginError', createErrorResponse('Invalid credentials', 'INVALID_CREDENTIALS'));
        this.logger.warn(`Failed login attempt: invalid password for agent ${agentUuid}`);
        return;
      }

      // Store authenticated session
      this.authenticatedClients.set(socket.id, agentUuid);

      // Get agent details for welcome message
      const agent = await this.agentsService.findOne(agentUuid);
      socket.emit(
        'loginSuccess',
        createSuccessResponse<LoginSuccessData>({
          message: `Welcome, ${agent.name}!`,
          agentId: agentUuid,
          agentName: agent.name,
        }),
      );
      this.logger.log(`Agent ${agent.name} (${agentUuid}) authenticated on socket ${socket.id}`);

      // Restore chat history
      await this.restoreChatHistory(agentUuid, socket);

      // Start periodic stats broadcasting and send first stats immediately
      await this.startStatsBroadcasting(agentUuid);
    } catch (error) {
      socket.emit('loginError', createErrorResponse('Invalid credentials', 'LOGIN_ERROR'));
      const err = error as { message?: string; stack?: string };
      this.logger.error(`Login error for agent ${agentId}: ${err.message}`, err.stack);
    }
  }

  /**
   * Restore and re-emit chat history for an agent.
   * Messages are emitted in chronological order by their creation date.
   * @param agentUuid - The UUID of the agent
   * @param socket - The socket instance to emit messages to
   */
  private async restoreChatHistory(agentUuid: string, socket: Socket): Promise<void> {
    try {
      // Fetch chat history (ordered chronologically by createdAt ASC)
      // Only restore the most recent 20 messages
      const chatHistory = await this.agentMessagesService.getChatHistory(agentUuid, 20, 0);

      if (chatHistory.length === 0) {
        this.logger.debug(`No chat history found for agent ${agentUuid}`);
        return;
      }

      this.logger.log(`Restoring ${chatHistory.length} messages for agent ${agentUuid}`);

      // Emit each message in chronological order
      for (const messageEntity of chatHistory) {
        const timestamp = messageEntity.createdAt.toISOString();

        if (messageEntity.actor === 'user') {
          // User message: emit with text field
          socket.emit(
            'chatMessage',
            createSuccessResponse<ChatMessageData>({
              from: ChatActor.USER,
              text: messageEntity.message,
              timestamp,
            }),
          );
        } else if (messageEntity.actor === 'agent') {
          // Agent message: apply the same cleaning and parsing logic as live communication
          // The stored message might be:
          // 1. A JSON string (from successful parse) - will parse successfully
          // 2. A cleaned string (toParse from failed parse) - might parse now or remain as string
          let toParse = messageEntity.message;

          // Apply the same cleaning logic as in handleChat
          // Remove everything before the first { in the string
          const firstBrace = toParse.indexOf('{');
          if (firstBrace !== -1) {
            toParse = toParse.slice(firstBrace);
          }
          // Remove everything after the last } in the string
          const lastBrace = toParse.lastIndexOf('}');
          if (lastBrace !== -1) {
            toParse = toParse.slice(0, lastBrace + 1);
          }

          let response: AgentResponseObject | string;
          try {
            // Try to parse the cleaned string
            const parsed = JSON.parse(toParse);
            response = parsed;
          } catch {
            // If parsing fails, use the cleaned string (same as live communication)
            response = toParse;
          }

          socket.emit(
            'chatMessage',
            createSuccessResponse<ChatMessageData>({
              from: ChatActor.AGENT,
              response,
              timestamp,
            }),
          );
        }
      }

      this.logger.debug(`Successfully restored ${chatHistory.length} messages for agent ${agentUuid}`);
    } catch (error) {
      const err = error as { message?: string; stack?: string };
      this.logger.warn(`Failed to restore chat history for agent ${agentUuid}: ${err.message}`, err.stack);
      // Don't fail login if history restoration fails
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
      socket.emit('error', createErrorResponse('Unauthorized. Please login first.', 'UNAUTHORIZED'));
      return;
    }

    const message = data.message?.trim();
    if (!message) {
      return;
    }

    // Create timestamp immediately for consistent message ordering
    const chatTimestamp = new Date().toISOString();

    // Broadcast user message immediately so UI shows "agent thinking" right away
    // This is especially important when agent is instantiating
    this.broadcastToAgent(
      agentUuid,
      'chatMessage',
      createSuccessResponse<ChatMessageData>({
        from: ChatActor.USER,
        text: message,
        timestamp: chatTimestamp,
      }),
    );

    try {
      // Get agent details for display
      const agent = await this.agentsService.findOne(agentUuid);
      this.logger.log(`Agent ${agent.name} (${agentUuid}) says: ${message}`);

      // Check if this is the first message for this agent
      // Send initialization message if agent has no chat history and hasn't received first message
      if (!this.agentsWithFirstMessageSent.has(agentUuid)) {
        const chatHistory = await this.agentMessagesService.getChatHistory(agentUuid, 1, 0);
        if (chatHistory.length === 0) {
          // This is the first message ever - send dummy initialization message first
          const entity = await this.agentsRepository.findById(agentUuid);
          const containerId = entity?.containerId;
          if (containerId) {
            try {
              // Get the appropriate provider based on agent type
              const provider = this.agentProviderFactory.getProvider(entity.agentType || 'cursor');
              await provider.sendInitialization(agent.id, containerId, { model: data.model });
              this.logger.debug(`Sent initialization message to agent ${agentUuid}`);
            } catch (error) {
              const err = error as { message?: string; stack?: string };
              this.logger.warn(
                `Failed to send initialization message to agent ${agentUuid}: ${err.message}`,
                err.stack,
              );
              // Continue with normal flow even if initialization fails
            }
          }
          // Mark agent as having received first message
          this.agentsWithFirstMessageSent.add(agentUuid);
        } else {
          // Agent has chat history, mark as initialized
          this.agentsWithFirstMessageSent.add(agentUuid);
        }
      }

      // Persist user message
      try {
        await this.agentMessagesService.createUserMessage(agentUuid, message);
      } catch (persistError) {
        const err = persistError as { message?: string };
        this.logger.warn(`Failed to persist user message: ${err.message}`);
        // Continue with message broadcasting even if persistence fails
      }

      // Forward message to the agent's container stdin
      const entity = await this.agentsRepository.findById(agentUuid);
      const containerId = entity?.containerId;
      if (containerId) {
        // Get the appropriate provider based on agent type
        try {
          const provider = this.agentProviderFactory.getProvider(entity.agentType || 'cursor');
          const agentResponse = await provider.sendMessage(agent.id, containerId, message, {
            model: data.model,
          });
          // Emit agent's response if there is any
          if (agentResponse && agentResponse.trim()) {
            const agentResponseTimestamp = new Date().toISOString();
            // Clean the response: remove everything before first { and after last }
            let toParse = agentResponse.trim();
            // Remove everything before the first { in the string
            const firstBrace = toParse.indexOf('{');
            if (firstBrace !== -1) {
              toParse = toParse.slice(firstBrace);
            }
            // Remove everything after the last } in the string
            const lastBrace = toParse.lastIndexOf('}');
            if (lastBrace !== -1) {
              toParse = toParse.slice(0, lastBrace + 1);
            }

            try {
              // Parse JSON response from agent
              const parsedResponse = JSON.parse(toParse);

              // Persist agent message
              try {
                await this.agentMessagesService.createAgentMessage(agentUuid, parsedResponse);
              } catch (persistError) {
                const err = persistError as { message?: string };
                this.logger.warn(`Failed to persist agent message: ${err.message}`);
                // Continue with message broadcasting even if persistence fails
              }

              // Broadcast agent response only to clients authenticated to this agent
              this.broadcastToAgent(
                agentUuid,
                'chatMessage',
                createSuccessResponse<ChatMessageData>({
                  from: ChatActor.AGENT,
                  response: parsedResponse,
                  timestamp: agentResponseTimestamp,
                }),
              );
            } catch (parseError) {
              // If JSON parsing fails, log error but still emit the cleaned response in response field
              const parseErr = parseError as { message?: string };
              this.logger.warn(`Failed to parse agent response as JSON: ${parseErr.message}`);

              // Persist agent message (cleaned string - toParse)
              // This ensures we can attempt to parse it again when restoring chat history
              try {
                await this.agentMessagesService.createAgentMessage(agentUuid, toParse);
              } catch (persistError) {
                const err = persistError as { message?: string };
                this.logger.warn(`Failed to persist agent message: ${err.message}`);
                // Continue with message broadcasting even if persistence fails
              }

              // Broadcast agent response only to clients authenticated to this agent
              this.broadcastToAgent(
                agentUuid,
                'chatMessage',
                createSuccessResponse<ChatMessageData>({
                  from: ChatActor.AGENT,
                  response: toParse,
                  timestamp: agentResponseTimestamp,
                }),
              );
            }
          }
        } catch (error) {
          const err = error as { message?: string; stack?: string };
          this.logger.error(`Error getting agent response: ${err.message}`, err.stack);
          // Don't fail the chat message, just log the error
        }
      }
    } catch (error) {
      socket.emit('error', createErrorResponse('Error processing chat message', 'CHAT_ERROR'));
      const err = error as { message?: string; stack?: string };
      this.logger.error(`Chat error for agent ${agentUuid}: ${err.message}`, err.stack);
    }
  }

  /**
   * Handle file update notification.
   * Broadcasts file update to all clients authenticated to the same agent.
   * Only authenticated agents can send file updates.
   * @param data - File update payload containing filePath
   * @param socket - The socket instance making the request
   */
  @SubscribeMessage('fileUpdate')
  async handleFileUpdate(@MessageBody() data: FileUpdatePayload, @ConnectedSocket() socket: Socket) {
    const agentUuid = this.authenticatedClients.get(socket.id);
    if (!agentUuid) {
      socket.emit('error', createErrorResponse('Unauthorized. Please login first.', 'UNAUTHORIZED'));
      return;
    }

    const filePath = data?.filePath?.trim();

    // Validate payload
    if (!filePath) {
      socket.emit('error', createErrorResponse('filePath is required', 'INVALID_PAYLOAD'));
      return;
    }

    try {
      // Get agent details for logging
      const agent = await this.agentsService.findOne(agentUuid);
      this.logger.log(`Agent ${agent.name} (${agentUuid}) updated file ${filePath} on socket ${socket.id}`);

      const updateTimestamp = new Date().toISOString();

      // Broadcast file update notification to all clients authenticated to this agent
      // The notification includes the socket ID so clients can determine if the update
      // came from themselves (same socket ID) or another client (different socket ID)
      this.broadcastToAgent(
        agentUuid,
        'fileUpdateNotification',
        createSuccessResponse<FileUpdateNotificationData>({
          socketId: socket.id,
          filePath,
          timestamp: updateTimestamp,
        }),
      );
    } catch (error) {
      socket.emit('error', createErrorResponse('Error processing file update', 'FILE_UPDATE_ERROR'));
      const err = error as { message?: string; stack?: string };
      this.logger.error(`File update error for agent ${agentUuid}: ${err.message}`, err.stack);
    }
  }

  /**
   * Handle agent logout.
   * Removes authenticated session and confirms logout.
   * @param socket - The socket instance making the request
   */
  @SubscribeMessage('logout')
  async handleLogout(@ConnectedSocket() socket: Socket) {
    const agentUuid = this.authenticatedClients.get(socket.id);

    if (agentUuid) {
      // Remove authenticated session
      this.authenticatedClients.delete(socket.id);

      // Clean up stats interval if this was the last socket for this agent
      this.cleanupStatsIntervalIfNeeded(agentUuid);

      try {
        // Get agent details for logging
        const agent = await this.agentsService.findOne(agentUuid);
        this.logger.log(`Agent ${agent.name} (${agentUuid}) logged out from socket ${socket.id}`);

        socket.emit(
          'logoutSuccess',
          createSuccessResponse<LogoutSuccessData>({
            message: 'Logged out successfully',
            agentId: agentUuid,
            agentName: agent.name,
          }),
        );
      } catch (error) {
        const err = error as { message?: string; stack?: string };
        this.logger.warn(`Failed to get agent details during logout: ${err.message}`, err.stack);
        // Still emit success since session is already cleared
        socket.emit(
          'logoutSuccess',
          createSuccessResponse<LogoutSuccessData>({
            message: 'Logged out successfully',
            agentId: agentUuid,
            agentName: 'Unknown',
          }),
        );
      }
    } else {
      // Not authenticated, but still acknowledge logout (idempotent)
      socket.emit(
        'logoutSuccess',
        createSuccessResponse<LogoutSuccessData>({
          message: 'Logged out successfully',
          agentId: null,
          agentName: null,
        }),
      );
      this.logger.debug(`Logout requested for unauthenticated socket ${socket.id}`);
    }
  }

  /**
   * Handle terminal session creation.
   * Creates a new TTY session for the authenticated agent's container.
   * Terminal sessions are client-specific (socket.id based).
   * @param data - Create terminal payload containing optional sessionId and shell
   * @param socket - The socket instance making the request
   */
  @SubscribeMessage('createTerminal')
  async handleCreateTerminal(@MessageBody() data: CreateTerminalPayload, @ConnectedSocket() socket: Socket) {
    const agentUuid = this.authenticatedClients.get(socket.id);
    if (!agentUuid) {
      socket.emit('error', createErrorResponse('Unauthorized. Please login first.', 'UNAUTHORIZED'));
      return;
    }

    try {
      // Get agent entity to find container
      const entity = await this.agentsRepository.findById(agentUuid);
      const containerId = entity?.containerId;
      if (!containerId) {
        socket.emit('error', createErrorResponse('Agent container not found', 'TERMINAL_ERROR'));
        return;
      }

      // Generate session ID: socket.id + timestamp to ensure uniqueness
      const sessionId = data.sessionId || `${socket.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // Create terminal session
      const stream = await this.dockerService.createTerminalSession(containerId, sessionId, data.shell || 'sh');

      // Track session for this socket
      let sessions = this.terminalSessionsBySocket.get(socket.id);
      if (!sessions) {
        sessions = new Set<string>();
        this.terminalSessionsBySocket.set(socket.id, sessions);
      }
      sessions.add(sessionId);

      // Set up stream data handler to forward output to client
      stream.on('data', (chunk: Buffer) => {
        if (socket.connected) {
          try {
            socket.emit('terminalOutput', createSuccessResponse({ sessionId, data: chunk.toString('utf-8') }));
          } catch (emitError) {
            this.logger.warn(`Failed to emit terminal output for session ${sessionId}: ${emitError}`);
          }
        }
      });

      // Handle stream end/close to notify client
      stream.on('end', () => {
        if (socket.connected) {
          try {
            socket.emit('terminalClosed', createSuccessResponse({ sessionId }));
          } catch (emitError) {
            this.logger.warn(`Failed to emit terminal closed for session ${sessionId}: ${emitError}`);
          }
        }
        // Clean up session tracking
        const socketSessions = this.terminalSessionsBySocket.get(socket.id);
        if (socketSessions) {
          socketSessions.delete(sessionId);
          if (socketSessions.size === 0) {
            this.terminalSessionsBySocket.delete(socket.id);
          }
        }
      });

      stream.on('close', () => {
        if (socket.connected) {
          try {
            socket.emit('terminalClosed', createSuccessResponse({ sessionId }));
          } catch (emitError) {
            this.logger.warn(`Failed to emit terminal closed for session ${sessionId}: ${emitError}`);
          }
        }
        // Clean up session tracking
        const socketSessions = this.terminalSessionsBySocket.get(socket.id);
        if (socketSessions) {
          socketSessions.delete(sessionId);
          if (socketSessions.size === 0) {
            this.terminalSessionsBySocket.delete(socket.id);
          }
        }
      });

      // Emit success response
      socket.emit('terminalCreated', createSuccessResponse({ sessionId }));
      this.logger.log(`Created terminal session ${sessionId} for agent ${agentUuid} on socket ${socket.id}`);
    } catch (error) {
      socket.emit('error', createErrorResponse('Error creating terminal session', 'TERMINAL_ERROR'));
      const err = error as { message?: string; stack?: string };
      this.logger.error(`Terminal creation error for agent ${agentUuid}: ${err.message}`, err.stack);
    }
  }

  /**
   * Handle terminal input.
   * Sends input data to a terminal session.
   * Only the socket that created the session can send input (enforced by sessionId format).
   * @param data - Terminal input payload containing sessionId and data
   * @param socket - The socket instance making the request
   */
  @SubscribeMessage('terminalInput')
  async handleTerminalInput(@MessageBody() data: TerminalInputPayload, @ConnectedSocket() socket: Socket) {
    const agentUuid = this.authenticatedClients.get(socket.id);
    if (!agentUuid) {
      socket.emit('error', createErrorResponse('Unauthorized. Please login first.', 'UNAUTHORIZED'));
      return;
    }

    const { sessionId, data: inputData } = data;

    if (!sessionId || !inputData) {
      socket.emit('error', createErrorResponse('sessionId and data are required', 'INVALID_PAYLOAD'));
      return;
    }

    // Verify session belongs to this socket
    const socketSessions = this.terminalSessionsBySocket.get(socket.id);
    if (!socketSessions || !socketSessions.has(sessionId)) {
      socket.emit('error', createErrorResponse('Terminal session not found or access denied', 'TERMINAL_ERROR'));
      return;
    }

    try {
      await this.dockerService.sendTerminalInput(sessionId, inputData);
    } catch (error) {
      const err = error as { message?: string };
      if (err.message?.includes('not found')) {
        // Session was closed, clean up tracking
        if (socketSessions) {
          socketSessions.delete(sessionId);
          if (socketSessions.size === 0) {
            this.terminalSessionsBySocket.delete(socket.id);
          }
        }
        socket.emit('terminalClosed', createSuccessResponse({ sessionId }));
      } else {
        socket.emit('error', createErrorResponse('Error sending terminal input', 'TERMINAL_ERROR'));
        this.logger.error(`Terminal input error for session ${sessionId}: ${err.message}`);
      }
    }
  }

  /**
   * Handle terminal session closure.
   * Closes a terminal session.
   * Only the socket that created the session can close it (enforced by sessionId format).
   * @param data - Close terminal payload containing sessionId
   * @param socket - The socket instance making the request
   */
  @SubscribeMessage('closeTerminal')
  async handleCloseTerminal(@MessageBody() data: CloseTerminalPayload, @ConnectedSocket() socket: Socket) {
    const agentUuid = this.authenticatedClients.get(socket.id);
    if (!agentUuid) {
      socket.emit('error', createErrorResponse('Unauthorized. Please login first.', 'UNAUTHORIZED'));
      return;
    }

    const { sessionId } = data;

    if (!sessionId) {
      socket.emit('error', createErrorResponse('sessionId is required', 'INVALID_PAYLOAD'));
      return;
    }

    // Verify session belongs to this socket
    const socketSessions = this.terminalSessionsBySocket.get(socket.id);
    if (!socketSessions || !socketSessions.has(sessionId)) {
      socket.emit('error', createErrorResponse('Terminal session not found or access denied', 'TERMINAL_ERROR'));
      return;
    }

    try {
      await this.dockerService.closeTerminalSession(sessionId);
      // Clean up session tracking
      socketSessions.delete(sessionId);
      if (socketSessions.size === 0) {
        this.terminalSessionsBySocket.delete(socket.id);
      }
      socket.emit('terminalClosed', createSuccessResponse({ sessionId }));
      this.logger.log(`Closed terminal session ${sessionId} for agent ${agentUuid} on socket ${socket.id}`);
    } catch (error) {
      const err = error as { message?: string };
      if (err.message?.includes('not found')) {
        // Session already closed, clean up tracking
        if (socketSessions) {
          socketSessions.delete(sessionId);
          if (socketSessions.size === 0) {
            this.terminalSessionsBySocket.delete(socket.id);
          }
        }
        socket.emit('terminalClosed', createSuccessResponse({ sessionId }));
      } else {
        socket.emit('error', createErrorResponse('Error closing terminal session', 'TERMINAL_ERROR'));
        this.logger.error(`Terminal close error for session ${sessionId}: ${err.message}`);
      }
    }
  }

  /**
   * Start periodic stats broadcasting for an agent.
   * Sends the first stats immediately, then continues periodically.
   * @param agentUuid - The UUID of the agent
   */
  private async startStatsBroadcasting(agentUuid: string): Promise<void> {
    // Check if stats interval already exists for this agent
    if (this.statsIntervalsByAgent.has(agentUuid)) {
      this.logger.debug(`Stats broadcasting already active for agent ${agentUuid}`);
      return;
    }

    // Get agent entity to find container
    const entity = await this.agentsRepository.findById(agentUuid);
    const containerId = entity?.containerId;
    if (!containerId) {
      this.logger.debug(`No container found for agent ${agentUuid}, skipping stats broadcasting`);
      return;
    }

    // Send first stats immediately
    await this.broadcastContainerStats(agentUuid, containerId);

    // Set up periodic stats broadcasting (every 5 seconds)
    const interval = setInterval(async () => {
      // Check if agent still has authenticated clients
      const hasAuthenticatedClients = Array.from(this.authenticatedClients.values()).includes(agentUuid);
      if (!hasAuthenticatedClients) {
        // No more authenticated clients, clean up interval
        this.cleanupStatsInterval(agentUuid);
        return;
      }

      try {
        await this.broadcastContainerStats(agentUuid, containerId);
      } catch (error) {
        const err = error as { message?: string };
        this.logger.warn(`Failed to broadcast stats for agent ${agentUuid}: ${err.message}`);
        // Continue broadcasting even if one attempt fails
      }
    }, 5000); // 5 seconds interval

    this.statsIntervalsByAgent.set(agentUuid, interval);
    this.logger.debug(`Started stats broadcasting for agent ${agentUuid}`);
  }

  /**
   * Broadcast container stats to all clients authenticated to an agent.
   * @param agentUuid - The UUID of the agent
   * @param containerId - The container ID
   */
  private async broadcastContainerStats(agentUuid: string, containerId: string): Promise<void> {
    try {
      const stats = await this.dockerService.getContainerStats(containerId);
      const statsTimestamp = new Date().toISOString();

      // Broadcast stats to all authenticated clients
      this.broadcastToAgent(
        agentUuid,
        'containerStats',
        createSuccessResponse({
          stats,
          timestamp: statsTimestamp,
        }),
      );
    } catch (error) {
      const err = error as { message?: string; stack?: string };
      // Log error but don't throw - periodic broadcasting should continue
      this.logger.warn(`Failed to get container stats for agent ${agentUuid}: ${err.message}`, err.stack);
    }
  }

  /**
   * Clean up stats interval for an agent if no more authenticated clients exist.
   * @param agentUuid - The UUID of the agent
   */
  private cleanupStatsIntervalIfNeeded(agentUuid: string): void {
    // Check if there are any authenticated clients for this agent
    const hasAuthenticatedClients = Array.from(this.authenticatedClients.values()).includes(agentUuid);
    if (!hasAuthenticatedClients) {
      this.cleanupStatsInterval(agentUuid);
    }
  }

  /**
   * Clean up stats interval for an agent.
   * @param agentUuid - The UUID of the agent
   */
  private cleanupStatsInterval(agentUuid: string): void {
    const interval = this.statsIntervalsByAgent.get(agentUuid);
    if (interval) {
      clearInterval(interval);
      this.statsIntervalsByAgent.delete(agentUuid);
      this.logger.debug(`Stopped stats broadcasting for agent ${agentUuid}`);
    }
  }
}
