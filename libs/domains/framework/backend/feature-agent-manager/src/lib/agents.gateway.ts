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
    } catch (error) {
      socket.emit('loginError', createErrorResponse('Invalid credentials', 'LOGIN_ERROR'));
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
      this.server.emit(
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
            try {
              // Parse JSON response from agent
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
              const parsedResponse = JSON.parse(toParse);
              this.server.emit(
                'chatMessage',
                createSuccessResponse<ChatMessageData>({
                  from: ChatActor.AGENT,
                  response: parsedResponse,
                  timestamp: agentResponseTimestamp,
                }),
              );
            } catch (parseError) {
              // If JSON parsing fails, log error but still emit the raw response in response field
              const parseErr = parseError as { message?: string };
              this.logger.warn(`Failed to parse agent response as JSON: ${parseErr.message}`);
              this.server.emit(
                'chatMessage',
                createSuccessResponse<ChatMessageData>({
                  from: ChatActor.AGENT,
                  response: agentResponse.trim(),
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
}
