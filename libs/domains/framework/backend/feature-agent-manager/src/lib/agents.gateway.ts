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
import { AgentMessagesService } from './services/agent-messages.service';
import { AgentsService } from './services/agents.service';
import { DockerService } from './services/docker.service';

interface LoginPayload {
  agentId: string;
  password: string;
}

interface ChatPayload {
  message: string;
}

interface FileUpdatePayload {
  filePath: string;
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

  constructor(
    private readonly agentsService: AgentsService,
    private readonly agentsRepository: AgentsRepository,
    private readonly dockerService: DockerService,
    private readonly agentMessagesService: AgentMessagesService,
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
    this.authenticatedClients.delete(socket.id);
    this.socketById.delete(socket.id);
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
      const chatHistory = await this.agentMessagesService.getChatHistory(agentUuid, 1000, 0);

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

    try {
      // Get agent details for display
      const agent = await this.agentsService.findOne(agentUuid);
      this.logger.log(`Agent ${agent.name} (${agentUuid}) says: ${message}`);
      const chatTimestamp = new Date().toISOString();

      // Persist user message
      try {
        await this.agentMessagesService.createUserMessage(agentUuid, message);
      } catch (persistError) {
        const err = persistError as { message?: string };
        this.logger.warn(`Failed to persist user message: ${err.message}`);
        // Continue with message broadcasting even if persistence fails
      }

      // Broadcast user message only to clients authenticated to this agent
      this.broadcastToAgent(
        agentUuid,
        'chatMessage',
        createSuccessResponse<ChatMessageData>({
          from: ChatActor.USER,
          text: message,
          timestamp: chatTimestamp,
        }),
      );

      // Forward message to the agent's container stdin
      const entity = await this.agentsRepository.findById(agentUuid);
      const containerId = entity?.containerId;
      if (containerId) {
        // Command to execute: cursor-agent with prompt mode and JSON output
        const command = `cursor-agent --print --approve-mcps --force --output-format json --resume ${agent.id}-${containerId}`;
        // Send the message to STDIN of the command and get the response
        try {
          const agentResponse = await this.dockerService.sendCommandToContainer(containerId, command, message);
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
}
