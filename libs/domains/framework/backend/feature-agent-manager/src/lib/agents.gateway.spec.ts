import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';
import { AgentsGateway } from './agents.gateway';
import { AgentEntity } from './entities/agent.entity';
import { AgentsRepository } from './repositories/agents.repository';
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
    getContainerLogs: jest.fn(),
    sendCommandToContainer: jest.fn(),
  } as unknown as jest.Mocked<DockerService>;

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
      ],
    }).compile();

    gateway = module.get<AgentsGateway>(AgentsGateway);
    agentsService = module.get(AgentsService);
    agentsRepository = module.get(AgentsRepository);
    dockerService = module.get(DockerService);

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
      // mock logs
      (dockerService.getContainerLogs as any).mockImplementation(async function* () {
        yield 'line1';
        yield 'line2';
      });
      const socketId = mockSocket.id || 'test-socket-id';

      await gateway.handleLogin({ agentId: mockAgent.id, password: 'password123' }, mockSocket as Socket);

      // Allow async log streaming task to run
      await new Promise((r) => setTimeout(r, 0));

      expect(agentsRepository.findById).toHaveBeenCalledWith(mockAgent.id);
      expect(agentsService.verifyCredentials).toHaveBeenCalledWith(mockAgent.id, 'password123');
      expect(agentsService.findOne).toHaveBeenCalledWith(mockAgent.id);
      expect(mockSocket.emit).toHaveBeenCalledWith('loginSuccess', {
        message: `Welcome, ${mockAgent.name}!`,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((gateway as any).authenticatedClients.get(socketId)).toBe(mockAgent.id);
      // Ensure container logs streamed to this socket
      expect(mockSocket.emit).toHaveBeenCalledWith('containerLog', { text: 'line1' });
      expect(mockSocket.emit).toHaveBeenCalledWith('containerLog', { text: 'line2' });
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
      expect(mockSocket.emit).toHaveBeenCalledWith('loginSuccess', {
        message: `Welcome, ${mockAgent.name}!`,
      });
    });

    it('should reject login with invalid UUID/name', async () => {
      agentsRepository.findById.mockResolvedValue(null);
      agentsRepository.findByName.mockResolvedValue(null);
      const loggerWarnSpy = jest.spyOn(gateway['logger'], 'warn').mockImplementation();
      const socketId = mockSocket.id || 'test-socket-id';

      await gateway.handleLogin({ agentId: 'non-existent', password: 'password123' }, mockSocket as Socket);

      expect(mockSocket.emit).toHaveBeenCalledWith('loginError', {
        message: 'Invalid credentials',
      });
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
      expect(mockSocket.emit).toHaveBeenCalledWith('loginError', {
        message: 'Invalid credentials',
      });
      expect(loggerWarnSpy).toHaveBeenCalledWith(`Failed login attempt: invalid password for agent ${mockAgent.id}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((gateway as any).authenticatedClients.has(socketId)).toBe(false);
      loggerWarnSpy.mockRestore();
    });

    it('should handle errors gracefully', async () => {
      agentsRepository.findById.mockRejectedValue(new Error('Database error'));
      const loggerErrorSpy = jest.spyOn(gateway['logger'], 'error').mockImplementation();

      await gateway.handleLogin({ agentId: mockAgent.id, password: 'password123' }, mockSocket as Socket);

      expect(mockSocket.emit).toHaveBeenCalledWith('loginError', {
        message: 'Invalid credentials',
      });
      expect(loggerErrorSpy).toHaveBeenCalled();
      loggerErrorSpy.mockRestore();
    });
  });

  describe('handleChat', () => {
    it('should broadcast chat message for authenticated user', async () => {
      const socketId = mockSocket.id || 'test-socket-id';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (gateway as any).authenticatedClients.set(socketId, mockAgent.id);
      agentsService.findOne.mockResolvedValue(mockAgentResponse);
      agentsRepository.findById.mockResolvedValue(mockAgent);
      const loggerLogSpy = jest.spyOn(gateway['logger'], 'log').mockImplementation();

      await gateway.handleChat({ message: 'Hello, world!' }, mockSocket as Socket);

      expect(agentsService.findOne).toHaveBeenCalledWith(mockAgent.id);
      expect(loggerLogSpy).toHaveBeenCalledWith(`Agent ${mockAgent.name} (${mockAgent.id}) says: Hello, world!`);
      expect(mockServer.emit).toHaveBeenCalledWith('chatMessage', {
        from: mockAgent.name,
        text: 'Hello, world!',
      });
      expect(dockerService.sendCommandToContainer).toHaveBeenCalledWith(
        'container-123',
        `cursor-agent -p --output-format json --resume ${mockAgent.id}-${mockAgent.containerId}`,
        'Hello, world!',
      );
      loggerLogSpy.mockRestore();
    });

    it('should reject chat message from unauthenticated user', async () => {
      await gateway.handleChat({ message: 'Hello, world!' }, mockSocket as Socket);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Unauthorized. Please login first.',
      });
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

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Error processing chat message',
      });
      expect(loggerErrorSpy).toHaveBeenCalled();
      loggerErrorSpy.mockRestore();
    });

    it('should trim message whitespace', async () => {
      const socketId = mockSocket.id || 'test-socket-id';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (gateway as any).authenticatedClients.set(socketId, mockAgent.id);
      agentsService.findOne.mockResolvedValue(mockAgentResponse);
      const loggerLogSpy = jest.spyOn(gateway['logger'], 'log').mockImplementation();

      await gateway.handleChat({ message: '  Hello, world!  ' }, mockSocket as Socket);

      expect(mockServer.emit).toHaveBeenCalledWith('chatMessage', {
        from: mockAgent.name,
        text: 'Hello, world!',
      });
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
