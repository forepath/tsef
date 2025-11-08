import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';
import { AgentsGateway } from './agents.gateway';
import { AgentEntity } from './entities/agent.entity';
import { AgentsRepository } from './repositories/agents.repository';
import { AgentMessagesService } from './services/agent-messages.service';
import { AgentsService } from './services/agents.service';
import { DockerService } from './services/docker.service';

interface ChatPayload {
  message: string;
}

describe('AgentsGateway', () => {
  let gateway: AgentsGateway;
  let agentsService: jest.Mocked<AgentsService>;
  let agentsRepository: jest.Mocked<AgentsRepository>;
  let dockerService: jest.Mocked<DockerService>;
  let agentMessagesService: jest.Mocked<AgentMessagesService>;
  let mockServer: Partial<Server>;
  let mockSocket: Partial<Socket>;

  const mockAgent: AgentEntity = {
    id: 'test-uuid-123',
    name: 'Test Agent',
    description: 'Test Description',
    hashedPassword: 'hashed-password',
    containerId: 'container-123',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockAgentResponse = {
    id: mockAgent.id,
    name: mockAgent.name,
    description: mockAgent.description,
    createdAt: mockAgent.createdAt,
    updatedAt: mockAgent.updatedAt,
  };

  const mockAgentsService = {
    verifyCredentials: jest.fn(),
    findOne: jest.fn(),
  };

  const mockAgentsRepository = {
    findById: jest.fn(),
    findByName: jest.fn(),
  };

  const mockDockerService = {
    sendCommandToContainer: jest.fn(),
  } as unknown as jest.Mocked<DockerService>;

  const mockAgentMessagesService = {
    createUserMessage: jest.fn(),
    createAgentMessage: jest.fn(),
    getChatHistory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentsGateway,
        {
          provide: AgentsService,
          useValue: mockAgentsService,
        },
        {
          provide: AgentsRepository,
          useValue: mockAgentsRepository,
        },
        {
          provide: DockerService,
          useValue: mockDockerService,
        },
        {
          provide: AgentMessagesService,
          useValue: mockAgentMessagesService,
        },
      ],
    }).compile();

    gateway = module.get<AgentsGateway>(AgentsGateway);
    agentsService = module.get(AgentsService);
    agentsRepository = module.get(AgentsRepository);
    dockerService = module.get(DockerService);
    agentMessagesService = module.get(AgentMessagesService);

    // Setup mock server
    mockServer = {
      emit: jest.fn(),
    };
    gateway.server = mockServer as Server;

    // Setup mock socket
    mockSocket = {
      id: 'test-socket-id',
      emit: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clear authenticated clients map
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (gateway as any).authenticatedClients.clear();
  });

  describe('handleConnection', () => {
    it('should log connection', () => {
      const loggerSpy = jest.spyOn(gateway['logger'], 'log').mockImplementation();
      gateway.handleConnection(mockSocket as Socket);
      expect(loggerSpy).toHaveBeenCalledWith(`Client connected: ${mockSocket.id}`);
      loggerSpy.mockRestore();
    });
  });

  describe('handleDisconnect', () => {
    it('should log disconnection and clean up authenticated session', () => {
      const loggerSpy = jest.spyOn(gateway['logger'], 'log').mockImplementation();
      // Add authenticated session
      const socketId = mockSocket.id || 'test-socket-id';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (gateway as any).authenticatedClients.set(socketId, mockAgent.id);
      gateway.handleDisconnect(mockSocket as Socket);
      expect(loggerSpy).toHaveBeenCalledWith(`Client disconnected: ${socketId}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((gateway as any).authenticatedClients.has(socketId)).toBe(false);
      loggerSpy.mockRestore();
    });

    it('should clean up session even if not authenticated', () => {
      const loggerSpy = jest.spyOn(gateway['logger'], 'log').mockImplementation();
      gateway.handleDisconnect(mockSocket as Socket);
      const socketId = mockSocket.id || 'test-socket-id';
      expect(loggerSpy).toHaveBeenCalledWith(`Client disconnected: ${socketId}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((gateway as any).authenticatedClients.has(socketId)).toBe(false);
      loggerSpy.mockRestore();
    });
  });

  describe('handleLogin', () => {
    it('should authenticate successfully with UUID', async () => {
      agentsRepository.findById.mockResolvedValue(mockAgent);
      agentsService.verifyCredentials.mockResolvedValue(true);
      agentsService.findOne.mockResolvedValue(mockAgentResponse);
      const socketId = mockSocket.id || 'test-socket-id';

      await gateway.handleLogin({ agentId: mockAgent.id, password: 'password123' }, mockSocket as Socket);

      expect(agentsRepository.findById).toHaveBeenCalledWith(mockAgent.id);
      expect(agentsService.verifyCredentials).toHaveBeenCalledWith(mockAgent.id, 'password123');
      expect(agentsService.findOne).toHaveBeenCalledWith(mockAgent.id);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'loginSuccess',
        expect.objectContaining({
          success: true,
          data: {
            message: `Welcome, ${mockAgent.name}!`,
            agentId: mockAgent.id,
            agentName: mockAgent.name,
          },
          timestamp: expect.any(String),
        }),
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((gateway as any).authenticatedClients.get(socketId)).toBe(mockAgent.id);
    });

    it('should restore chat history after successful login', async () => {
      agentsRepository.findById.mockResolvedValue(mockAgent);
      agentsService.verifyCredentials.mockResolvedValue(true);
      agentsService.findOne.mockResolvedValue(mockAgentResponse);

      const mockMessages = [
        {
          id: 'msg-1',
          agentId: mockAgent.id,
          actor: 'user',
          message: 'Hello',
          createdAt: new Date('2024-01-01T10:00:00Z'),
          updatedAt: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: 'msg-2',
          agentId: mockAgent.id,
          actor: 'agent',
          message: '{"type":"response","result":"Hi there!"}',
          createdAt: new Date('2024-01-01T10:00:01Z'),
          updatedAt: new Date('2024-01-01T10:00:01Z'),
        },
        {
          id: 'msg-3',
          agentId: mockAgent.id,
          actor: 'user',
          message: 'How are you?',
          createdAt: new Date('2024-01-01T10:00:02Z'),
          updatedAt: new Date('2024-01-01T10:00:02Z'),
        },
      ];

      agentMessagesService.getChatHistory.mockResolvedValue(mockMessages as any);

      await gateway.handleLogin({ agentId: mockAgent.id, password: 'password123' }, mockSocket as Socket);

      // Verify chat history was fetched
      expect(agentMessagesService.getChatHistory).toHaveBeenCalledWith(mockAgent.id, 1000, 0);

      // Verify messages were emitted in chronological order
      expect(mockSocket.emit).toHaveBeenCalledTimes(4); // loginSuccess + 3 chat messages

      // Check first message (user)
      expect(mockSocket.emit).toHaveBeenNthCalledWith(
        2,
        'chatMessage',
        expect.objectContaining({
          success: true,
          data: {
            from: 'user',
            text: 'Hello',
            timestamp: '2024-01-01T10:00:00.000Z',
          },
        }),
      );

      // Check second message (agent with JSON)
      expect(mockSocket.emit).toHaveBeenNthCalledWith(
        3,
        'chatMessage',
        expect.objectContaining({
          success: true,
          data: {
            from: 'agent',
            response: { type: 'response', result: 'Hi there!' },
            timestamp: '2024-01-01T10:00:01.000Z',
          },
        }),
      );

      // Check third message (user)
      expect(mockSocket.emit).toHaveBeenNthCalledWith(
        4,
        'chatMessage',
        expect.objectContaining({
          success: true,
          data: {
            from: 'user',
            text: 'How are you?',
            timestamp: '2024-01-01T10:00:02.000Z',
          },
        }),
      );
    });

    it('should handle agent messages with non-JSON strings (applies cleaning logic)', async () => {
      agentsRepository.findById.mockResolvedValue(mockAgent);
      agentsService.verifyCredentials.mockResolvedValue(true);
      agentsService.findOne.mockResolvedValue(mockAgentResponse);

      // Simulate a stored message that's already cleaned (from failed parse)
      // This would be stored as 'toParse' - a cleaned string without surrounding text
      const mockMessages = [
        {
          id: 'msg-1',
          agentId: mockAgent.id,
          actor: 'agent',
          message: 'Plain text response', // Already cleaned (no { or } to clean)
          createdAt: new Date('2024-01-01T10:00:00Z'),
          updatedAt: new Date('2024-01-01T10:00:00Z'),
        },
      ];

      agentMessagesService.getChatHistory.mockResolvedValue(mockMessages as any);

      await gateway.handleLogin({ agentId: mockAgent.id, password: 'password123' }, mockSocket as Socket);

      // Verify message was emitted with string response (after cleaning logic is applied)
      // Since there's no { or }, cleaning won't change it, and parsing will fail, so it uses the cleaned string
      expect(mockSocket.emit).toHaveBeenNthCalledWith(
        2,
        'chatMessage',
        expect.objectContaining({
          success: true,
          data: {
            from: 'agent',
            response: 'Plain text response', // Cleaned string (same as input since no { or })
            timestamp: expect.any(String),
          },
        }),
      );
    });

    it('should apply cleaning logic to agent messages during restoration (same as live)', async () => {
      agentsRepository.findById.mockResolvedValue(mockAgent);
      agentsService.verifyCredentials.mockResolvedValue(true);
      agentsService.findOne.mockResolvedValue(mockAgentResponse);

      // Simulate a stored message that might have extra text (though this shouldn't happen in practice)
      // This tests that cleaning logic is applied consistently
      const mockMessages = [
        {
          id: 'msg-1',
          agentId: mockAgent.id,
          actor: 'agent',
          message: 'Some prefix text {"type":"response","result":"Success"} some suffix',
          createdAt: new Date('2024-01-01T10:00:00Z'),
          updatedAt: new Date('2024-01-01T10:00:00Z'),
        },
      ];

      agentMessagesService.getChatHistory.mockResolvedValue(mockMessages as any);

      await gateway.handleLogin({ agentId: mockAgent.id, password: 'password123' }, mockSocket as Socket);

      // Verify cleaning logic was applied and JSON was parsed (same as live communication)
      expect(mockSocket.emit).toHaveBeenNthCalledWith(
        2,
        'chatMessage',
        expect.objectContaining({
          success: true,
          data: {
            from: 'agent',
            response: { type: 'response', result: 'Success' }, // Parsed JSON object
            timestamp: expect.any(String),
          },
        }),
      );
    });

    it('should handle empty chat history gracefully', async () => {
      agentsRepository.findById.mockResolvedValue(mockAgent);
      agentsService.verifyCredentials.mockResolvedValue(true);
      agentsService.findOne.mockResolvedValue(mockAgentResponse);
      agentMessagesService.getChatHistory.mockResolvedValue([]);

      await gateway.handleLogin({ agentId: mockAgent.id, password: 'password123' }, mockSocket as Socket);

      // Verify chat history was fetched
      expect(agentMessagesService.getChatHistory).toHaveBeenCalledWith(mockAgent.id, 1000, 0);

      // Only loginSuccess should be emitted
      expect(mockSocket.emit).toHaveBeenCalledTimes(1);
      expect(mockSocket.emit).toHaveBeenCalledWith('loginSuccess', expect.any(Object));
    });

    it('should continue login even if chat history restoration fails', async () => {
      agentsRepository.findById.mockResolvedValue(mockAgent);
      agentsService.verifyCredentials.mockResolvedValue(true);
      agentsService.findOne.mockResolvedValue(mockAgentResponse);
      agentMessagesService.getChatHistory.mockRejectedValue(new Error('Database error'));

      const loggerWarnSpy = jest.spyOn(gateway['logger'], 'warn').mockImplementation();

      await gateway.handleLogin({ agentId: mockAgent.id, password: 'password123' }, mockSocket as Socket);

      // Login should still succeed
      expect(mockSocket.emit).toHaveBeenCalledWith('loginSuccess', expect.any(Object));
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to restore chat history'),
        expect.any(String),
      );

      loggerWarnSpy.mockRestore();
    });

    it('should authenticate successfully with agent name', async () => {
      agentsRepository.findById.mockResolvedValue(null);
      agentsRepository.findByName.mockResolvedValue(mockAgent);
      agentsService.verifyCredentials.mockResolvedValue(true);
      agentsService.findOne.mockResolvedValue(mockAgentResponse);

      await gateway.handleLogin({ agentId: mockAgent.name, password: 'password123' }, mockSocket as Socket);

      expect(agentsRepository.findById).toHaveBeenCalledWith(mockAgent.name);
      expect(agentsRepository.findByName).toHaveBeenCalledWith(mockAgent.name);
      expect(agentsService.verifyCredentials).toHaveBeenCalledWith(mockAgent.id, 'password123');
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'loginSuccess',
        expect.objectContaining({
          success: true,
          data: {
            message: `Welcome, ${mockAgent.name}!`,
            agentId: mockAgent.id,
            agentName: mockAgent.name,
          },
          timestamp: expect.any(String),
        }),
      );
    });

    it('should reject login with invalid UUID/name', async () => {
      agentsRepository.findById.mockResolvedValue(null);
      agentsRepository.findByName.mockResolvedValue(null);
      const loggerWarnSpy = jest.spyOn(gateway['logger'], 'warn').mockImplementation();
      const socketId = mockSocket.id || 'test-socket-id';

      await gateway.handleLogin({ agentId: 'non-existent', password: 'password123' }, mockSocket as Socket);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'loginError',
        expect.objectContaining({
          success: false,
          error: {
            message: 'Invalid credentials',
            code: 'INVALID_CREDENTIALS',
          },
          timestamp: expect.any(String),
        }),
      );
      expect(loggerWarnSpy).toHaveBeenCalledWith(`Failed login attempt: agent not found (non-existent)`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((gateway as any).authenticatedClients.has(socketId)).toBe(false);
      loggerWarnSpy.mockRestore();
    });

    it('should reject login with wrong password', async () => {
      agentsRepository.findById.mockResolvedValue(mockAgent);
      agentsService.verifyCredentials.mockResolvedValue(false);
      const loggerWarnSpy = jest.spyOn(gateway['logger'], 'warn').mockImplementation();
      const socketId = mockSocket.id || 'test-socket-id';

      await gateway.handleLogin({ agentId: mockAgent.id, password: 'wrong-password' }, mockSocket as Socket);

      expect(agentsService.verifyCredentials).toHaveBeenCalledWith(mockAgent.id, 'wrong-password');
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'loginError',
        expect.objectContaining({
          success: false,
          error: {
            message: 'Invalid credentials',
            code: 'INVALID_CREDENTIALS',
          },
          timestamp: expect.any(String),
        }),
      );
      expect(loggerWarnSpy).toHaveBeenCalledWith(`Failed login attempt: invalid password for agent ${mockAgent.id}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((gateway as any).authenticatedClients.has(socketId)).toBe(false);
      loggerWarnSpy.mockRestore();
    });

    it('should handle errors gracefully', async () => {
      agentsRepository.findById.mockRejectedValue(new Error('Database error'));
      const loggerErrorSpy = jest.spyOn(gateway['logger'], 'error').mockImplementation();

      await gateway.handleLogin({ agentId: mockAgent.id, password: 'password123' }, mockSocket as Socket);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'loginError',
        expect.objectContaining({
          success: false,
          error: {
            message: 'Invalid credentials',
            code: 'LOGIN_ERROR',
          },
          timestamp: expect.any(String),
        }),
      );
      expect(loggerErrorSpy).toHaveBeenCalled();
      loggerErrorSpy.mockRestore();
    });
  });

  describe('handleChat', () => {
    it('should broadcast chat message for authenticated user and emit agent response', async () => {
      const socketId = mockSocket.id || 'test-socket-id';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (gateway as any).authenticatedClients.set(socketId, mockAgent.id);
      agentsService.findOne.mockResolvedValue(mockAgentResponse);
      agentsRepository.findById.mockResolvedValue(mockAgent);
      const mockAgentResponseJson = JSON.stringify({
        type: 'result',
        subtype: 'success',
        is_error: false,
        result: 'Hello from agent!',
      });
      dockerService.sendCommandToContainer.mockResolvedValue(mockAgentResponseJson);
      const loggerLogSpy = jest.spyOn(gateway['logger'], 'log').mockImplementation();

      await gateway.handleChat({ message: 'Hello, world!' }, mockSocket as Socket);

      expect(agentsService.findOne).toHaveBeenCalledWith(mockAgent.id);
      expect(loggerLogSpy).toHaveBeenCalledWith(`Agent ${mockAgent.name} (${mockAgent.id}) says: Hello, world!`);
      // Check user message emission
      expect(mockServer.emit).toHaveBeenCalledWith(
        'chatMessage',
        expect.objectContaining({
          success: true,
          data: {
            from: 'user',
            text: 'Hello, world!',
            timestamp: expect.any(String),
          },
          timestamp: expect.any(String),
        }),
      );
      expect(dockerService.sendCommandToContainer).toHaveBeenCalledWith(
        'container-123',
        `cursor-agent --print --approve-mcps --force --output-format json --resume ${mockAgent.id}-${mockAgent.containerId}`,
        'Hello, world!',
      );
      // Check agent response emission with parsed JSON
      expect(mockServer.emit).toHaveBeenCalledWith(
        'chatMessage',
        expect.objectContaining({
          success: true,
          data: {
            from: 'agent',
            response: {
              type: 'result',
              subtype: 'success',
              is_error: false,
              result: 'Hello from agent!',
            },
            timestamp: expect.any(String),
          },
          timestamp: expect.any(String),
        }),
      );
      loggerLogSpy.mockRestore();
    });

    it('should reject chat message from unauthenticated user', async () => {
      await gateway.handleChat({ message: 'Hello, world!' }, mockSocket as Socket);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({
          success: false,
          error: {
            message: 'Unauthorized. Please login first.',
            code: 'UNAUTHORIZED',
          },
          timestamp: expect.any(String),
        }),
      );
      expect(mockServer.emit).not.toHaveBeenCalled();
    });

    it('should ignore empty messages', async () => {
      const socketId = mockSocket.id || 'test-socket-id';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (gateway as any).authenticatedClients.set(socketId, mockAgent.id);

      await gateway.handleChat({ message: '   ' }, mockSocket as Socket);

      expect(agentsService.findOne).not.toHaveBeenCalled();
      expect(mockServer.emit).not.toHaveBeenCalled();
    });

    it('should ignore messages with only whitespace', async () => {
      const socketId = mockSocket.id || 'test-socket-id';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (gateway as any).authenticatedClients.set(socketId, mockAgent.id);

      await gateway.handleChat({ message: '\n\t  \n' }, mockSocket as Socket);

      expect(agentsService.findOne).not.toHaveBeenCalled();
      expect(mockServer.emit).not.toHaveBeenCalled();
    });

    it('should handle missing message property', async () => {
      const socketId = mockSocket.id || 'test-socket-id';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (gateway as any).authenticatedClients.set(socketId, mockAgent.id);

      await gateway.handleChat({} as ChatPayload, mockSocket as Socket);

      expect(agentsService.findOne).not.toHaveBeenCalled();
      expect(mockServer.emit).not.toHaveBeenCalled();
    });

    it('should handle errors when fetching agent details', async () => {
      const socketId = mockSocket.id || 'test-socket-id';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (gateway as any).authenticatedClients.set(socketId, mockAgent.id);
      agentsService.findOne.mockRejectedValue(new Error('Database error'));
      const loggerErrorSpy = jest.spyOn(gateway['logger'], 'error').mockImplementation();

      await gateway.handleChat({ message: 'Hello!' }, mockSocket as Socket);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({
          success: false,
          error: {
            message: 'Error processing chat message',
            code: 'CHAT_ERROR',
          },
          timestamp: expect.any(String),
        }),
      );
      expect(loggerErrorSpy).toHaveBeenCalled();
      loggerErrorSpy.mockRestore();
    });

    it('should not emit agent response if response is empty', async () => {
      const socketId = mockSocket.id || 'test-socket-id';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (gateway as any).authenticatedClients.set(socketId, mockAgent.id);
      agentsService.findOne.mockResolvedValue(mockAgentResponse);
      agentsRepository.findById.mockResolvedValue(mockAgent);
      dockerService.sendCommandToContainer.mockResolvedValue('');
      const loggerLogSpy = jest.spyOn(gateway['logger'], 'log').mockImplementation();

      await gateway.handleChat({ message: 'Hello!' }, mockSocket as Socket);

      // Should emit user message
      expect(mockServer.emit).toHaveBeenCalledWith(
        'chatMessage',
        expect.objectContaining({
          success: true,
          data: {
            from: 'user',
            text: 'Hello!',
            timestamp: expect.any(String),
          },
          timestamp: expect.any(String),
        }),
      );
      // Should not emit agent response (empty)
      const agentResponseCalls = (mockServer.emit as jest.Mock).mock.calls.filter(
        (call) => call[0] === 'chatMessage' && call[1].data?.from === 'agent',
      );
      expect(agentResponseCalls.length).toBe(0);
      loggerLogSpy.mockRestore();
    });

    it('should fall back to text if JSON parsing fails', async () => {
      const socketId = mockSocket.id || 'test-socket-id';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (gateway as any).authenticatedClients.set(socketId, mockAgent.id);
      agentsService.findOne.mockResolvedValue(mockAgentResponse);
      agentsRepository.findById.mockResolvedValue(mockAgent);
      dockerService.sendCommandToContainer.mockResolvedValue('Invalid JSON response');
      const loggerWarnSpy = jest.spyOn(gateway['logger'], 'warn').mockImplementation();
      const loggerLogSpy = jest.spyOn(gateway['logger'], 'log').mockImplementation();

      await gateway.handleChat({ message: 'Hello!' }, mockSocket as Socket);

      // Should emit user message
      expect(mockServer.emit).toHaveBeenCalledWith(
        'chatMessage',
        expect.objectContaining({
          success: true,
          data: {
            from: 'user',
            text: 'Hello!',
            timestamp: expect.any(String),
          },
          timestamp: expect.any(String),
        }),
      );
      // Should emit agent response with response field (fallback) since JSON parsing failed
      expect(mockServer.emit).toHaveBeenCalledWith(
        'chatMessage',
        expect.objectContaining({
          success: true,
          data: {
            from: 'agent',
            response: 'Invalid JSON response',
            timestamp: expect.any(String),
          },
          timestamp: expect.any(String),
        }),
      );
      // Should log warning about JSON parsing failure
      expect(loggerWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to parse agent response as JSON'));
      loggerWarnSpy.mockRestore();
      loggerLogSpy.mockRestore();
    });

    it('should handle errors when getting agent response gracefully', async () => {
      const socketId = mockSocket.id || 'test-socket-id';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (gateway as any).authenticatedClients.set(socketId, mockAgent.id);
      agentsService.findOne.mockResolvedValue(mockAgentResponse);
      agentsRepository.findById.mockResolvedValue(mockAgent);
      dockerService.sendCommandToContainer.mockRejectedValue(new Error('Container error'));
      const loggerErrorSpy = jest.spyOn(gateway['logger'], 'error').mockImplementation();
      const loggerLogSpy = jest.spyOn(gateway['logger'], 'log').mockImplementation();

      await gateway.handleChat({ message: 'Hello!' }, mockSocket as Socket);

      // Should still emit user message
      expect(mockServer.emit).toHaveBeenCalledWith(
        'chatMessage',
        expect.objectContaining({
          success: true,
          data: {
            from: 'user',
            text: 'Hello!',
            timestamp: expect.any(String),
          },
          timestamp: expect.any(String),
        }),
      );
      // Should log the error but not fail the chat
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error getting agent response'),
        expect.any(String),
      );
      loggerErrorSpy.mockRestore();
      loggerLogSpy.mockRestore();
    });

    it('should trim message whitespace', async () => {
      const socketId = mockSocket.id || 'test-socket-id';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (gateway as any).authenticatedClients.set(socketId, mockAgent.id);
      agentsService.findOne.mockResolvedValue(mockAgentResponse);
      const loggerLogSpy = jest.spyOn(gateway['logger'], 'log').mockImplementation();

      await gateway.handleChat({ message: '  Hello, world!  ' }, mockSocket as Socket);

      expect(mockServer.emit).toHaveBeenCalledWith(
        'chatMessage',
        expect.objectContaining({
          success: true,
          data: {
            from: 'user',
            text: 'Hello, world!',
            timestamp: expect.any(String),
          },
          timestamp: expect.any(String),
        }),
      );
      loggerLogSpy.mockRestore();
    });
  });

  describe('findAgentIdByIdentifier', () => {
    it('should find agent by UUID', async () => {
      agentsRepository.findById.mockResolvedValue(mockAgent);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (gateway as any).findAgentIdByIdentifier(mockAgent.id);

      expect(result).toBe(mockAgent.id);
      expect(agentsRepository.findById).toHaveBeenCalledWith(mockAgent.id);
      expect(agentsRepository.findByName).not.toHaveBeenCalled();
    });

    it('should find agent by name when UUID lookup fails', async () => {
      agentsRepository.findById.mockResolvedValue(null);
      agentsRepository.findByName.mockResolvedValue(mockAgent);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (gateway as any).findAgentIdByIdentifier(mockAgent.name);

      expect(result).toBe(mockAgent.id);
      expect(agentsRepository.findById).toHaveBeenCalledWith(mockAgent.name);
      expect(agentsRepository.findByName).toHaveBeenCalledWith(mockAgent.name);
    });

    it('should return null when agent not found', async () => {
      agentsRepository.findById.mockResolvedValue(null);
      agentsRepository.findByName.mockResolvedValue(null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (gateway as any).findAgentIdByIdentifier('non-existent');

      expect(result).toBeNull();
    });
  });
});
