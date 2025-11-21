import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as sshpk from 'sshpk';
import { CreateAgentDto } from '../dto/create-agent.dto';
import { UpdateAgentDto } from '../dto/update-agent.dto';
import { AgentEntity } from '../entities/agent.entity';
import { AgentsRepository } from '../repositories/agents.repository';
import { AgentsService } from './agents.service';
import { DockerService } from './docker.service';
import { PasswordService } from './password.service';

describe('AgentsService', () => {
  let service: AgentsService;
  let repository: jest.Mocked<AgentsRepository>;
  let passwordService: jest.Mocked<PasswordService>;
  let dockerService: jest.Mocked<DockerService>;

  const mockAgent: AgentEntity = {
    id: 'test-uuid',
    name: 'Test Agent',
    description: 'Test Description',
    hashedPassword: 'hashed-password',
    containerId: 'container-id-123',
    volumePath: '/opt/agents/test-volume-uuid',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockRepository = {
    findByIdOrThrow: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockPasswordService = {
    hashPassword: jest.fn(),
    verifyPassword: jest.fn(),
  };

  const mockDockerService = {
    createContainer: jest.fn(),
    deleteContainer: jest.fn(),
    sendCommandToContainer: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentsService,
        {
          provide: AgentsRepository,
          useValue: mockRepository,
        },
        {
          provide: PasswordService,
          useValue: mockPasswordService,
        },
        {
          provide: DockerService,
          useValue: mockDockerService,
        },
      ],
    }).compile();

    service = module.get<AgentsService>(AgentsService);
    repository = module.get(AgentsRepository);
    passwordService = module.get(PasswordService);
    dockerService = module.get(DockerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.GIT_USERNAME;
    delete process.env.GIT_TOKEN;
    delete process.env.GIT_PASSWORD;
    delete process.env.GIT_REPOSITORY_URL;
    delete process.env.GIT_PRIVATE_KEY;
    delete process.env.CURSOR_API_KEY;
  });

  describe('create', () => {
    beforeEach(() => {
      // Set up required environment variables for git operations
      process.env.GIT_USERNAME = 'testuser';
      process.env.GIT_TOKEN = 'test-token-123';
      process.env.GIT_REPOSITORY_URL = 'https://github.com/user/repo.git';
      process.env.GIT_REPOSITORY_URL = 'https://github.com/user/repo.git';
    });

    it('should create new agent with auto-generated password and container', async () => {
      const createDto: CreateAgentDto = {
        name: 'New Agent',
        description: 'New Description',
      };
      const hashedPassword = 'hashed-password';
      const containerId = 'container-id-123';
      const volumePath = '/opt/agents/test-volume-uuid';
      const createdAgent = {
        ...mockAgent,
        name: createDto.name,
        description: createDto.description,
        hashedPassword,
        containerId,
        volumePath,
      };

      mockRepository.findByName.mockResolvedValue(null);
      passwordService.hashPassword.mockResolvedValue(hashedPassword);
      dockerService.createContainer.mockResolvedValue(containerId);
      dockerService.sendCommandToContainer.mockResolvedValue(undefined);
      repository.create.mockResolvedValue(createdAgent);

      const result = await service.create(createDto);

      expect(result.id).toBe(mockAgent.id);
      expect(result.name).toBe(createDto.name);
      expect(result.description).toBe(createDto.description);
      expect(result.password).toBeDefined();
      expect(result.password.length).toBeGreaterThan(0);
      expect(typeof result.password).toBe('string');
      expect(repository.findByName).toHaveBeenCalledWith(createDto.name);
      expect(passwordService.hashPassword).toHaveBeenCalled();
      expect(dockerService.createContainer).toHaveBeenCalledWith({
        name: createDto.name,
        env: {
          AGENT_NAME: createDto.name,
          CURSOR_API_KEY: process.env.CURSOR_API_KEY,
          GIT_REPOSITORY_URL: process.env.GIT_REPOSITORY_URL,
          GIT_USERNAME: process.env.GIT_USERNAME,
          GIT_TOKEN: process.env.GIT_TOKEN,
          GIT_PASSWORD: process.env.GIT_PASSWORD,
        },
        volumes: [
          {
            hostPath: expect.stringMatching(/^\/opt\/agents\/[a-f0-9-]+$/),
            containerPath: '/app',
            readOnly: false,
          },
        ],
      });
      // Verify .netrc file creation commands were called (4 commands: 3 echo + 1 chmod)
      expect(dockerService.sendCommandToContainer).toHaveBeenCalledTimes(5); // 4 for .netrc + 1 for git clone
      expect(dockerService.sendCommandToContainer).toHaveBeenNthCalledWith(
        1,
        containerId,
        expect.stringContaining('echo machine'),
      );
      expect(dockerService.sendCommandToContainer).toHaveBeenNthCalledWith(
        2,
        containerId,
        expect.stringContaining('echo'),
      );
      expect(dockerService.sendCommandToContainer).toHaveBeenNthCalledWith(
        3,
        containerId,
        expect.stringContaining('echo'),
      );
      expect(dockerService.sendCommandToContainer).toHaveBeenNthCalledWith(4, containerId, 'chmod 600 /root/.netrc');
      expect(dockerService.sendCommandToContainer).toHaveBeenNthCalledWith(
        5,
        containerId,
        `sh -c "git clone '${process.env.GIT_REPOSITORY_URL}' /app"`,
      );
      expect(repository.create).toHaveBeenCalledWith({
        name: createDto.name,
        description: createDto.description,
        hashedPassword,
        containerId,
        volumePath: expect.stringMatching(/^\/opt\/agents\/[a-f0-9-]+$/),
      });
    });

    it('should create agent without description', async () => {
      const createDto: CreateAgentDto = {
        name: 'New Agent',
      };
      const hashedPassword = 'hashed-password';
      const containerId = 'container-id-123';
      const volumePath = '/opt/agents/test-volume-uuid';
      const createdAgent: AgentEntity = {
        id: mockAgent.id,
        name: createDto.name,
        hashedPassword,
        containerId,
        volumePath,
        createdAt: mockAgent.createdAt,
        updatedAt: mockAgent.updatedAt,
      };

      mockRepository.findByName.mockResolvedValue(null);
      passwordService.hashPassword.mockResolvedValue(hashedPassword);
      dockerService.createContainer.mockResolvedValue(containerId);
      dockerService.sendCommandToContainer.mockResolvedValue(undefined);
      repository.create.mockResolvedValue(createdAgent);

      const result = await service.create(createDto);

      expect(result.name).toBe(createDto.name);
      expect(result.description).toBeUndefined();
      expect(dockerService.createContainer).toHaveBeenCalledWith({
        name: createDto.name,
        env: {
          AGENT_NAME: createDto.name,
          CURSOR_API_KEY: process.env.CURSOR_API_KEY,
          GIT_REPOSITORY_URL: process.env.GIT_REPOSITORY_URL,
          GIT_USERNAME: process.env.GIT_USERNAME,
          GIT_TOKEN: process.env.GIT_TOKEN,
          GIT_PASSWORD: process.env.GIT_PASSWORD,
        },
        volumes: [
          {
            hostPath: expect.stringMatching(/^\/opt\/agents\/[a-f0-9-]+$/),
            containerPath: '/app',
            readOnly: false,
          },
        ],
      });
      // Verify .netrc file creation was called
      expect(dockerService.sendCommandToContainer).toHaveBeenCalledTimes(5);
      expect(repository.create).toHaveBeenCalledWith({
        name: createDto.name,
        description: undefined,
        hashedPassword,
        containerId,
        volumePath: expect.stringMatching(/^\/opt\/agents\/[a-f0-9-]+$/),
      });
    });

    it('should throw BadRequestException when git credentials are missing', async () => {
      const createDto: CreateAgentDto = {
        name: 'New Agent',
      };

      // Clear git credentials but set repository URL (for HTTPS repo)
      delete process.env.GIT_USERNAME;
      delete process.env.GIT_TOKEN;
      delete process.env.GIT_PASSWORD;
      process.env.GIT_REPOSITORY_URL = 'https://github.com/user/repo.git';

      mockRepository.findByName.mockResolvedValue(null);
      passwordService.hashPassword.mockResolvedValue('hashed-password');
      dockerService.createContainer.mockResolvedValue('container-id-123');

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow(
        'Git credentials not configured. Please set GIT_USERNAME, GIT_TOKEN (or GIT_PASSWORD), and GIT_REPOSITORY_URL environment variables.',
      );
    });

    it('should throw BadRequestException when GIT_USERNAME is missing', async () => {
      const createDto: CreateAgentDto = {
        name: 'New Agent',
      };

      delete process.env.GIT_USERNAME;
      process.env.GIT_TOKEN = 'test-token';
      process.env.GIT_REPOSITORY_URL = 'https://github.com/user/repo.git';

      mockRepository.findByName.mockResolvedValue(null);
      passwordService.hashPassword.mockResolvedValue('hashed-password');
      dockerService.createContainer.mockResolvedValue('container-id-123');

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when GIT_TOKEN and GIT_PASSWORD are missing', async () => {
      const createDto: CreateAgentDto = {
        name: 'New Agent',
      };

      process.env.GIT_USERNAME = 'testuser';
      delete process.env.GIT_TOKEN;
      delete process.env.GIT_PASSWORD;
      process.env.GIT_REPOSITORY_URL = 'https://github.com/user/repo.git';

      mockRepository.findByName.mockResolvedValue(null);
      passwordService.hashPassword.mockResolvedValue('hashed-password');
      dockerService.createContainer.mockResolvedValue('container-id-123');

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });

    it('should use GIT_PASSWORD when GIT_TOKEN is not available', async () => {
      const createDto: CreateAgentDto = {
        name: 'New Agent',
      };
      const hashedPassword = 'hashed-password';
      const containerId = 'container-id-123';
      const createdAgent = {
        ...mockAgent,
        name: createDto.name,
        hashedPassword,
        containerId,
      };

      process.env.GIT_USERNAME = 'testuser';
      delete process.env.GIT_TOKEN;
      process.env.GIT_PASSWORD = 'test-password';
      process.env.GIT_REPOSITORY_URL = 'https://github.com/user/repo.git';
      process.env.GIT_REPOSITORY_URL = 'https://github.com/user/repo.git';

      mockRepository.findByName.mockResolvedValue(null);
      passwordService.hashPassword.mockResolvedValue(hashedPassword);
      dockerService.createContainer.mockResolvedValue(containerId);
      dockerService.sendCommandToContainer.mockResolvedValue(undefined);
      repository.create.mockResolvedValue(createdAgent);

      await service.create(createDto);

      // Verify .netrc creation was called (should use GIT_PASSWORD)
      expect(dockerService.sendCommandToContainer).toHaveBeenCalledTimes(5);
    });

    it('should throw BadRequestException when agent name already exists', async () => {
      const createDto: CreateAgentDto = {
        name: 'Existing Agent',
      };

      mockRepository.findByName.mockResolvedValue(mockAgent);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });

    it('should clean up container when createNetrcFile fails', async () => {
      const createDto: CreateAgentDto = {
        name: 'New Agent',
      };
      const containerId = 'container-id-123';

      mockRepository.findByName.mockResolvedValue(null);
      passwordService.hashPassword.mockResolvedValue('hashed-password');
      dockerService.createContainer.mockResolvedValue(containerId);
      // Set repository URL but clear git credentials to cause createNetrcFile to fail
      process.env.GIT_REPOSITORY_URL = 'https://github.com/user/repo.git';
      delete process.env.GIT_USERNAME;
      delete process.env.GIT_TOKEN;
      delete process.env.GIT_PASSWORD;
      dockerService.deleteContainer.mockResolvedValue(undefined);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);

      // Verify container was created
      expect(dockerService.createContainer).toHaveBeenCalled();
      // Verify container cleanup was attempted
      expect(dockerService.deleteContainer).toHaveBeenCalledWith(containerId);
      // Verify repository.create was never called
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should clean up container when git clone fails', async () => {
      const createDto: CreateAgentDto = {
        name: 'New Agent',
      };
      const containerId = 'container-id-123';
      const gitCloneError = new Error('Git clone failed');

      mockRepository.findByName.mockResolvedValue(null);
      passwordService.hashPassword.mockResolvedValue('hashed-password');
      dockerService.createContainer.mockResolvedValue(containerId);
      dockerService.sendCommandToContainer
        .mockResolvedValueOnce(undefined) // First 4 calls for .netrc creation succeed
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(gitCloneError); // Git clone fails
      dockerService.deleteContainer.mockResolvedValue(undefined);

      await expect(service.create(createDto)).rejects.toThrow('Git clone failed');

      // Verify container was created
      expect(dockerService.createContainer).toHaveBeenCalled();
      // Verify .netrc creation (4 commands) and git clone (1 attempt) were called
      expect(dockerService.sendCommandToContainer).toHaveBeenCalledTimes(5);
      // Verify container cleanup was attempted
      expect(dockerService.deleteContainer).toHaveBeenCalledWith(containerId);
      // Verify repository.create was never called
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should clean up container when repository.create fails', async () => {
      const createDto: CreateAgentDto = {
        name: 'New Agent',
      };
      const containerId = 'container-id-123';
      const repositoryError = new Error('Database error');

      mockRepository.findByName.mockResolvedValue(null);
      passwordService.hashPassword.mockResolvedValue('hashed-password');
      dockerService.createContainer.mockResolvedValue(containerId);
      dockerService.sendCommandToContainer.mockResolvedValue(undefined);
      repository.create.mockRejectedValue(repositoryError);
      dockerService.deleteContainer.mockResolvedValue(undefined);

      await expect(service.create(createDto)).rejects.toThrow('Database error');

      // Verify container was created
      expect(dockerService.createContainer).toHaveBeenCalled();
      // Verify .netrc creation and git clone were attempted
      expect(dockerService.sendCommandToContainer).toHaveBeenCalledTimes(5);
      // Verify repository.create was attempted
      expect(repository.create).toHaveBeenCalled();
      // Verify container cleanup was attempted
      expect(dockerService.deleteContainer).toHaveBeenCalledWith(containerId);
    });

    it('should still throw original error if container cleanup fails', async () => {
      const createDto: CreateAgentDto = {
        name: 'New Agent',
      };
      const containerId = 'container-id-123';
      const originalError = new Error('Git clone failed');
      const cleanupError = new Error('Cleanup failed');

      mockRepository.findByName.mockResolvedValue(null);
      passwordService.hashPassword.mockResolvedValue('hashed-password');
      dockerService.createContainer.mockResolvedValue(containerId);
      dockerService.sendCommandToContainer
        .mockResolvedValueOnce(undefined) // First 4 calls for .netrc creation succeed
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(originalError); // Git clone fails
      dockerService.deleteContainer.mockRejectedValue(cleanupError);

      // Should throw the original error, not the cleanup error
      await expect(service.create(createDto)).rejects.toThrow('Git clone failed');

      // Verify cleanup was attempted
      expect(dockerService.deleteContainer).toHaveBeenCalledWith(containerId);
    });

    it('should create agent with SSH repository using provided private key', async () => {
      const createDto: CreateAgentDto = {
        name: 'SSH Agent',
        description: 'SSH Description',
      };
      const hashedPassword = 'hashed-password';
      const containerId = 'container-id-123';
      const volumePath = '/opt/agents/test-volume-uuid';
      const createdAgent = {
        ...mockAgent,
        name: createDto.name,
        description: createDto.description,
        hashedPassword,
        containerId,
        volumePath,
      };

      // Generate a test SSH key using sshpk (Ed25519 is supported for generation)
      const key = sshpk.generatePrivateKey('ed25519');
      const privateKeyPem = key.toString('openssh');

      process.env.GIT_REPOSITORY_URL = 'git@github.com:user/repo.git';
      process.env.GIT_PRIVATE_KEY = privateKeyPem;

      mockRepository.findByName.mockResolvedValue(null);
      passwordService.hashPassword.mockResolvedValue(hashedPassword);
      dockerService.createContainer.mockResolvedValue(containerId);
      dockerService.sendCommandToContainer.mockResolvedValue(undefined);
      repository.create.mockResolvedValue(createdAgent);

      const result = await service.create(createDto);

      expect(result.id).toBe(mockAgent.id);
      expect(result.name).toBe(createDto.name);
      expect(result.description).toBe(createDto.description);
      expect(result.password).toBeDefined();
      expect(dockerService.createContainer).toHaveBeenCalledWith({
        name: createDto.name,
        env: {
          AGENT_NAME: createDto.name,
          CURSOR_API_KEY: process.env.CURSOR_API_KEY,
          GIT_REPOSITORY_URL: process.env.GIT_REPOSITORY_URL,
          GIT_USERNAME: process.env.GIT_USERNAME,
          GIT_TOKEN: process.env.GIT_TOKEN,
          GIT_PASSWORD: process.env.GIT_PASSWORD,
          GIT_PRIVATE_KEY: process.env.GIT_PRIVATE_KEY,
        },
        volumes: [
          {
            hostPath: expect.stringMatching(/^\/opt\/agents\/[a-f0-9-]+$/),
            containerPath: '/app',
            readOnly: false,
          },
        ],
      });
      // Verify SSH setup commands: mkdir, chmod .ssh, write key, chmod key, ssh-keyscan, chmod known_hosts, git clone
      expect(dockerService.sendCommandToContainer).toHaveBeenCalledTimes(7);
      expect(dockerService.sendCommandToContainer).toHaveBeenNthCalledWith(1, containerId, 'mkdir -p /root/.ssh');
      expect(dockerService.sendCommandToContainer).toHaveBeenNthCalledWith(2, containerId, 'chmod 700 /root/.ssh');
      expect(dockerService.sendCommandToContainer).toHaveBeenNthCalledWith(
        3,
        containerId,
        expect.stringMatching(/echo .* \| base64 -d > \/root\/\.ssh\/id_ed25519/),
      );
      expect(dockerService.sendCommandToContainer).toHaveBeenNthCalledWith(
        4,
        containerId,
        'chmod 600 /root/.ssh/id_ed25519',
      );
      expect(dockerService.sendCommandToContainer).toHaveBeenNthCalledWith(
        5,
        containerId,
        expect.stringMatching(/ssh-keyscan.*github\.com.*>> \/root\/\.ssh\/known_hosts/),
      );
      expect(dockerService.sendCommandToContainer).toHaveBeenNthCalledWith(
        6,
        containerId,
        'chmod 600 /root/.ssh/known_hosts || true',
      );
      expect(dockerService.sendCommandToContainer).toHaveBeenNthCalledWith(
        7,
        containerId,
        expect.stringMatching(/sh -c "git clone .*git@github\.com:user\/repo\.git.*\/app"/),
      );
      expect(repository.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when SSH repository URL is missing private key', async () => {
      const createDto: CreateAgentDto = {
        name: 'SSH Agent',
      };

      process.env.GIT_REPOSITORY_URL = 'git@github.com:user/repo.git';
      delete process.env.GIT_PRIVATE_KEY;

      mockRepository.findByName.mockResolvedValue(null);
      passwordService.hashPassword.mockResolvedValue('hashed-password');
      dockerService.createContainer.mockResolvedValue('container-id-123');

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow(
        'Invalid SSH private key. Ensure it is in PEM or OpenSSH format without a passphrase.',
      );
    });

    it('should throw BadRequestException when SSH private key is invalid', async () => {
      const createDto: CreateAgentDto = {
        name: 'SSH Agent',
      };

      process.env.GIT_REPOSITORY_URL = 'git@github.com:user/repo.git';
      process.env.GIT_PRIVATE_KEY = 'invalid-key-content';

      mockRepository.findByName.mockResolvedValue(null);
      passwordService.hashPassword.mockResolvedValue('hashed-password');
      dockerService.createContainer.mockResolvedValue('container-id-123');

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow(
        'Invalid SSH private key. Ensure it is in PEM or OpenSSH format without a passphrase.',
      );
    });

    it('should throw BadRequestException when GIT_REPOSITORY_URL is missing', async () => {
      const createDto: CreateAgentDto = {
        name: 'New Agent',
      };

      delete process.env.GIT_REPOSITORY_URL;

      mockRepository.findByName.mockResolvedValue(null);
      passwordService.hashPassword.mockResolvedValue('hashed-password');

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow(
        'Git repository URL not configured. Please set GIT_REPOSITORY_URL.',
      );
    });

    it('should clean up container when SSH configuration fails', async () => {
      const createDto: CreateAgentDto = {
        name: 'SSH Agent',
      };
      const containerId = 'container-id-123';

      process.env.GIT_REPOSITORY_URL = 'git@github.com:user/repo.git';
      delete process.env.GIT_PRIVATE_KEY;

      mockRepository.findByName.mockResolvedValue(null);
      passwordService.hashPassword.mockResolvedValue('hashed-password');
      dockerService.createContainer.mockResolvedValue(containerId);
      dockerService.deleteContainer.mockResolvedValue(undefined);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);

      expect(dockerService.createContainer).toHaveBeenCalled();
      expect(dockerService.deleteContainer).toHaveBeenCalledWith(containerId);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return array of agents', async () => {
      const agents = [mockAgent];
      mockRepository.findAll.mockResolvedValue(agents);

      const result = await service.findAll(10, 0);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockAgent.id);
      expect(result[0]).not.toHaveProperty('hashedPassword');
      expect(repository.findAll).toHaveBeenCalledWith(10, 0);
    });

    it('should use default pagination values', async () => {
      const agents = [mockAgent];
      mockRepository.findAll.mockResolvedValue(agents);

      await service.findAll();

      expect(repository.findAll).toHaveBeenCalledWith(10, 0);
    });
  });

  describe('findOne', () => {
    it('should return agent by id', async () => {
      mockRepository.findByIdOrThrow.mockResolvedValue(mockAgent);

      const result = await service.findOne('test-uuid');

      expect(result.id).toBe(mockAgent.id);
      expect(result).not.toHaveProperty('hashedPassword');
      expect(repository.findByIdOrThrow).toHaveBeenCalledWith('test-uuid');
    });
  });

  describe('update', () => {
    it('should update agent', async () => {
      const updateDto: UpdateAgentDto = {
        name: 'Updated Agent',
        description: 'Updated Description',
      };
      const updatedAgent = { ...mockAgent, ...updateDto };

      mockRepository.findByName.mockResolvedValue(null);
      repository.update.mockResolvedValue(updatedAgent);

      const result = await service.update('test-uuid', updateDto);

      expect(result.name).toBe(updateDto.name);
      expect(repository.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException when new name conflicts', async () => {
      const updateDto: UpdateAgentDto = {
        name: 'Conflicting Name',
      };
      const conflictingAgent = { ...mockAgent, id: 'different-id' };

      mockRepository.findByName.mockResolvedValue(conflictingAgent);

      await expect(service.update('test-uuid', updateDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete agent with container', async () => {
      mockRepository.findByIdOrThrow.mockResolvedValue(mockAgent);
      dockerService.deleteContainer.mockResolvedValue(undefined);
      repository.delete.mockResolvedValue(undefined);

      await service.remove('test-uuid');

      expect(repository.findByIdOrThrow).toHaveBeenCalledWith('test-uuid');
      expect(dockerService.deleteContainer).toHaveBeenCalledWith(mockAgent.containerId);
      expect(repository.delete).toHaveBeenCalledWith('test-uuid');
    });

    it('should delete agent without container', async () => {
      const agentWithoutContainer = { ...mockAgent, containerId: undefined };
      mockRepository.findByIdOrThrow.mockResolvedValue(agentWithoutContainer);
      repository.delete.mockResolvedValue(undefined);

      await service.remove('test-uuid');

      expect(repository.findByIdOrThrow).toHaveBeenCalledWith('test-uuid');
      expect(dockerService.deleteContainer).not.toHaveBeenCalled();
      expect(repository.delete).toHaveBeenCalledWith('test-uuid');
    });

    it('should delete agent when containerId is null', async () => {
      const agentWithNullContainer = { ...mockAgent, containerId: null as string | undefined };
      mockRepository.findByIdOrThrow.mockResolvedValue(agentWithNullContainer);
      repository.delete.mockResolvedValue(undefined);

      await service.remove('test-uuid');

      expect(repository.findByIdOrThrow).toHaveBeenCalledWith('test-uuid');
      expect(dockerService.deleteContainer).not.toHaveBeenCalled();
      expect(repository.delete).toHaveBeenCalledWith('test-uuid');
    });
  });

  describe('verifyCredentials', () => {
    it('should return true when credentials are valid', async () => {
      mockRepository.findById.mockResolvedValue(mockAgent);
      passwordService.verifyPassword.mockResolvedValue(true);

      const result = await service.verifyCredentials('test-uuid', 'password');

      expect(result).toBe(true);
      expect(passwordService.verifyPassword).toHaveBeenCalledWith('password', mockAgent.hashedPassword);
    });

    it('should return false when agent not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await service.verifyCredentials('non-existent', 'password');

      expect(result).toBe(false);
      expect(passwordService.verifyPassword).not.toHaveBeenCalled();
    });

    it('should return false when password does not match', async () => {
      mockRepository.findById.mockResolvedValue(mockAgent);
      passwordService.verifyPassword.mockResolvedValue(false);

      const result = await service.verifyCredentials('test-uuid', 'wrong');

      expect(result).toBe(false);
      expect(passwordService.verifyPassword).toHaveBeenCalledWith('wrong', mockAgent.hashedPassword);
    });
  });

  describe('generateRandomPassword', () => {
    it('should generate passwords of correct length', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const password1 = (service as any).generateRandomPassword();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const password2 = (service as any).generateRandomPassword();

      expect(password1).toHaveLength(16);
      expect(password2).toHaveLength(16);
      expect(password1).not.toBe(password2); // Should be random
    });

    it('should generate passwords with alphanumeric characters', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const password = (service as any).generateRandomPassword();
      const alphanumericRegex = /^[a-zA-Z0-9]+$/;

      expect(password).toMatch(alphanumericRegex);
    });
  });

  describe('extractGitDomain', () => {
    beforeEach(() => {
      process.env.GIT_USERNAME = 'testuser';
      process.env.GIT_TOKEN = 'test-token';
      process.env.GIT_REPOSITORY_URL = 'https://github.com/user/repo.git';
    });

    it('should extract domain from https URL', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const domain = (service as any).extractGitDomain('https://github.com/user/repo.git');
      expect(domain).toBe('github.com');
    });

    it('should extract domain from http URL', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const domain = (service as any).extractGitDomain('http://gitlab.com/user/repo.git');
      expect(domain).toBe('gitlab.com');
    });

    it('should extract domain from git@ URL', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const domain = (service as any).extractGitDomain('git@github.com:user/repo.git');
      expect(domain).toBe('github.com');
    });

    it('should extract domain from URL with port', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const domain = (service as any).extractGitDomain('https://git.example.com:8443/user/repo.git');
      expect(domain).toBe('git.example.com');
    });

    it('should return default github.com for invalid URL', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const domain = (service as any).extractGitDomain('invalid-url');
      expect(domain).toBe('github.com');
    });

    it('should extract domain from URL with path', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const domain = (service as any).extractGitDomain('https://bitbucket.org/workspace/repo.git');
      expect(domain).toBe('bitbucket.org');
    });
  });

  describe('createNetrcFile', () => {
    beforeEach(() => {
      process.env.GIT_USERNAME = 'testuser';
      process.env.GIT_TOKEN = 'test-token-123';
      process.env.GIT_REPOSITORY_URL = 'https://github.com/user/repo.git';
    });

    it('should create .netrc file with correct format', async () => {
      const containerId = 'container-id-123';
      dockerService.sendCommandToContainer.mockResolvedValue(undefined);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).createNetrcFile(containerId);

      expect(dockerService.sendCommandToContainer).toHaveBeenCalledTimes(4);
      // Verify first command creates machine line
      expect(dockerService.sendCommandToContainer).toHaveBeenNthCalledWith(
        1,
        containerId,
        expect.stringMatching(/echo machine.*github\.com.*> \/root\/\.netrc/),
      );
      // Verify second command adds login line
      expect(dockerService.sendCommandToContainer).toHaveBeenNthCalledWith(
        2,
        containerId,
        expect.stringMatching(/echo.*login.*testuser.*>> \/root\/\.netrc/),
      );
      // Verify third command adds password line
      expect(dockerService.sendCommandToContainer).toHaveBeenNthCalledWith(
        3,
        containerId,
        expect.stringMatching(/echo.*password.*test-token-123.*>> \/root\/\.netrc/),
      );
      // Verify fourth command sets permissions
      expect(dockerService.sendCommandToContainer).toHaveBeenNthCalledWith(4, containerId, 'chmod 600 /root/.netrc');
    });

    it('should escape special characters in credentials', async () => {
      const containerId = 'container-id-123';
      process.env.GIT_USERNAME = "user'name";
      process.env.GIT_TOKEN = "token'with'quotes";
      process.env.GIT_REPOSITORY_URL = 'https://github.com/user/repo.git';
      dockerService.sendCommandToContainer.mockResolvedValue(undefined);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).createNetrcFile(containerId);

      // Verify that single quotes are properly escaped
      expect(dockerService.sendCommandToContainer).toHaveBeenNthCalledWith(
        2,
        containerId,
        expect.stringContaining("'user'\\''name'"),
      );
      expect(dockerService.sendCommandToContainer).toHaveBeenNthCalledWith(
        3,
        containerId,
        expect.stringContaining("'token'\\''with'\\''quotes'"),
      );
    });

    it('should throw BadRequestException when GIT_USERNAME is missing', async () => {
      const containerId = 'container-id-123';
      delete process.env.GIT_USERNAME;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect((service as any).createNetrcFile(containerId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when GIT_TOKEN and GIT_PASSWORD are missing', async () => {
      const containerId = 'container-id-123';
      delete process.env.GIT_TOKEN;
      delete process.env.GIT_PASSWORD;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect((service as any).createNetrcFile(containerId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when GIT_REPOSITORY_URL is missing', async () => {
      const containerId = 'container-id-123';
      delete process.env.GIT_REPOSITORY_URL;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect((service as any).createNetrcFile(containerId)).rejects.toThrow(BadRequestException);
    });

    it('should use GIT_PASSWORD when GIT_TOKEN is not available', async () => {
      const containerId = 'container-id-123';
      delete process.env.GIT_TOKEN;
      process.env.GIT_PASSWORD = 'test-password';
      dockerService.sendCommandToContainer.mockResolvedValue(undefined);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).createNetrcFile(containerId);

      expect(dockerService.sendCommandToContainer).toHaveBeenCalledTimes(4);
      // Verify password line uses GIT_PASSWORD
      expect(dockerService.sendCommandToContainer).toHaveBeenNthCalledWith(
        3,
        containerId,
        expect.stringContaining("'test-password'"),
      );
    });
  });

  describe('escapeForShell', () => {
    it('should escape strings with single quotes', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (service as any).escapeForShell("test'string");
      expect(result).toBe("'test'\\''string'");
    });

    it('should wrap simple strings in single quotes', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (service as any).escapeForShell('simple-string');
      expect(result).toBe("'simple-string'");
    });

    it('should handle empty strings', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (service as any).escapeForShell('');
      expect(result).toBe("''");
    });

    it('should handle strings with multiple single quotes', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (service as any).escapeForShell("a'b'c");
      expect(result).toBe("'a'\\''b'\\''c'");
    });
  });

  describe('isSshRepository', () => {
    it('should return true for git@ URL', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (service as any).isSshRepository('git@github.com:user/repo.git');
      expect(result).toBe(true);
    });

    it('should return true for ssh:// URL', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (service as any).isSshRepository('ssh://git@github.com/user/repo.git');
      expect(result).toBe(true);
    });

    it('should return false for https:// URL', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (service as any).isSshRepository('https://github.com/user/repo.git');
      expect(result).toBe(false);
    });

    it('should return false for http:// URL', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (service as any).isSshRepository('http://github.com/user/repo.git');
      expect(result).toBe(false);
    });

    it('should return false for undefined URL', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (service as any).isSshRepository(undefined);
      expect(result).toBe(false);
    });

    it('should return false for empty string', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (service as any).isSshRepository('');
      expect(result).toBe(false);
    });
  });

  describe('getSshHostInfo', () => {
    it('should extract host from ssh:// URL', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (service as any).getSshHostInfo('ssh://git@github.com:22/user/repo.git');
      expect(result).toEqual({ host: 'github.com', port: 22 });
    });

    it('should extract host from ssh:// URL without port', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (service as any).getSshHostInfo('ssh://git@github.com/user/repo.git');
      expect(result).toEqual({ host: 'github.com' });
    });

    it('should extract host from git@ URL', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (service as any).getSshHostInfo('git@github.com:user/repo.git');
      expect(result).toEqual({ host: 'github.com' });
    });

    it('should fallback to extractGitDomain for other formats', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (service as any).getSshHostInfo('https://gitlab.com/user/repo.git');
      expect(result).toEqual({ host: 'gitlab.com' });
    });
  });

  describe('getSshKeyFilename', () => {
    it('should return id_rsa for RSA keys', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (service as any).getSshKeyFilename('rsa');
      expect(result).toBe('id_rsa');
    });

    it('should return id_ed25519 for Ed25519 keys', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (service as any).getSshKeyFilename('ed25519');
      expect(result).toBe('id_ed25519');
    });

    it('should return id_ecdsa for ECDSA keys', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (service as any).getSshKeyFilename('ecdsa');
      expect(result).toBe('id_ecdsa');
    });

    it('should return id_dsa for DSA keys', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (service as any).getSshKeyFilename('dsa');
      expect(result).toBe('id_dsa');
    });

    it('should handle uppercase key types', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (service as any).getSshKeyFilename('RSA');
      expect(result).toBe('id_rsa');
    });

    it('should default to id_rsa for unknown key types', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (service as any).getSshKeyFilename('unknown');
      expect(result).toBe('id_rsa');
    });
  });

  describe('prepareSshKeyPair', () => {
    it('should parse valid Ed25519 private key', () => {
      const key = sshpk.generatePrivateKey('ed25519');
      const privateKeyPem = key.toString('openssh');
      const publicKey = key.toPublic().toString('ssh');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (service as any).prepareSshKeyPair(privateKeyPem);

      expect(result.privateKey).toContain('BEGIN');
      expect(result.privateKey).toContain('END');
      // Compare public keys by extracting the key part (before any comment)
      expect(result.publicKey.split(' ').slice(0, 2).join(' ')).toBe(publicKey.split(' ').slice(0, 2).join(' '));
      expect(result.keyFilename).toBe('id_ed25519');
      expect(result.generated).toBe(false);
    });

    it('should parse valid Ed25519 private key', () => {
      const key = sshpk.generatePrivateKey('ed25519');
      const privateKeyPem = key.toString('openssh');
      const publicKey = key.toPublic().toString('ssh');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (service as any).prepareSshKeyPair(privateKeyPem);

      expect(result.privateKey).toContain('BEGIN');
      // Compare public keys by extracting the key part (before any comment)
      expect(result.publicKey.split(' ').slice(0, 2).join(' ')).toBe(publicKey.split(' ').slice(0, 2).join(' '));
      expect(result.keyFilename).toBe('id_ed25519');
      expect(result.generated).toBe(false);
    });

    it('should throw BadRequestException for invalid private key', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => (service as any).prepareSshKeyPair('invalid-key')).toThrow(BadRequestException);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => (service as any).prepareSshKeyPair('invalid-key')).toThrow(
        'Invalid SSH private key. Ensure it is in PEM or OpenSSH format without a passphrase.',
      );
    });

    it('should throw BadRequestException when private key is undefined', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => (service as any).prepareSshKeyPair(undefined)).toThrow(BadRequestException);
    });

    it('should throw BadRequestException when private key is empty string', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => (service as any).prepareSshKeyPair('')).toThrow(BadRequestException);
    });

    it('should trim whitespace from private key', () => {
      const key = sshpk.generatePrivateKey('ed25519');
      const privateKeyPem = key.toString('openssh');
      const publicKey = key.toPublic().toString('ssh');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (service as any).prepareSshKeyPair(`  ${privateKeyPem}  `);

      // Compare public keys by extracting the key part (before any comment)
      expect(result.publicKey.split(' ').slice(0, 2).join(' ')).toBe(publicKey.split(' ').slice(0, 2).join(' '));
      expect(result.keyFilename).toBe('id_ed25519');
    });
  });

  describe('writeFileToContainer', () => {
    it('should write file content to container using base64 encoding', async () => {
      const containerId = 'container-id-123';
      const filePath = '/root/.ssh/id_rsa';
      const contents = 'test file content\nwith newlines';

      dockerService.sendCommandToContainer.mockResolvedValue(undefined);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).writeFileToContainer(containerId, filePath, contents);

      expect(dockerService.sendCommandToContainer).toHaveBeenCalledTimes(1);
      const callArgs = dockerService.sendCommandToContainer.mock.calls[0];
      expect(callArgs[0]).toBe(containerId);
      expect(callArgs[1]).toContain('echo');
      expect(callArgs[1]).toContain('base64 -d');
      expect(callArgs[1]).toContain(filePath);
      // Verify base64 encoding
      const base64Content = Buffer.from(contents, 'utf-8').toString('base64');
      expect(callArgs[1]).toContain(base64Content);
    });

    it('should escape base64 content for shell', async () => {
      const containerId = 'container-id-123';
      const filePath = '/root/test';
      const contents = "content with 'quotes'";

      dockerService.sendCommandToContainer.mockResolvedValue(undefined);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).writeFileToContainer(containerId, filePath, contents);

      const callArgs = dockerService.sendCommandToContainer.mock.calls[0];
      // Base64 content should be escaped
      expect(callArgs[1]).toMatch(/echo '.*' \| base64 -d >/);
    });
  });

  describe('configureSshAccess', () => {
    beforeEach(() => {
      process.env.GIT_REPOSITORY_URL = 'git@github.com:user/repo.git';
    });

    it('should configure SSH access with Ed25519 key', async () => {
      const containerId = 'container-id-123';
      const key = sshpk.generatePrivateKey('ed25519');
      const privateKeyPem = key.toString('openssh');
      const publicKey = key.toPublic().toString('ssh');

      dockerService.sendCommandToContainer.mockResolvedValue(undefined);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (service as any).configureSshAccess(
        containerId,
        'git@github.com:user/repo.git',
        privateKeyPem,
      );

      // Compare public keys by extracting the key part (before any comment)
      expect(result.publicKey.split(' ').slice(0, 2).join(' ')).toBe(publicKey.split(' ').slice(0, 2).join(' '));
      expect(result.privateKey).toBeUndefined(); // generated is false, so privateKey is not returned
      expect(dockerService.sendCommandToContainer).toHaveBeenCalledTimes(6);
      expect(dockerService.sendCommandToContainer).toHaveBeenNthCalledWith(1, containerId, 'mkdir -p /root/.ssh');
      expect(dockerService.sendCommandToContainer).toHaveBeenNthCalledWith(2, containerId, 'chmod 700 /root/.ssh');
      expect(dockerService.sendCommandToContainer).toHaveBeenNthCalledWith(
        3,
        containerId,
        expect.stringMatching(/echo .* \| base64 -d > \/root\/\.ssh\/id_ed25519/),
      );
      expect(dockerService.sendCommandToContainer).toHaveBeenNthCalledWith(
        4,
        containerId,
        'chmod 600 /root/.ssh/id_ed25519',
      );
      expect(dockerService.sendCommandToContainer).toHaveBeenNthCalledWith(
        5,
        containerId,
        expect.stringMatching(/ssh-keyscan.*github\.com.*>> \/root\/\.ssh\/known_hosts/),
      );
      expect(dockerService.sendCommandToContainer).toHaveBeenNthCalledWith(
        6,
        containerId,
        'chmod 600 /root/.ssh/known_hosts || true',
      );
    });

    it('should handle SSH URL with port', async () => {
      const containerId = 'container-id-123';
      const key = sshpk.generatePrivateKey('ed25519');
      const privateKeyPem = key.toString('openssh');

      dockerService.sendCommandToContainer.mockResolvedValue(undefined);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).configureSshAccess(containerId, 'ssh://git@github.com:22/user/repo.git', privateKeyPem);

      expect(dockerService.sendCommandToContainer).toHaveBeenCalledWith(
        containerId,
        expect.stringMatching(/ssh-keyscan -p 22 github\.com/),
      );
    });

    it('should throw BadRequestException for invalid private key', async () => {
      const containerId = 'container-id-123';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const serviceAny = service as any;
      await expect(
        serviceAny.configureSshAccess(containerId, 'git@github.com:user/repo.git', 'invalid-key'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
