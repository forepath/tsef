import {
  AgentResponseDto,
  CreateAgentDto,
  CreateAgentResponseDto,
  CreateFileDto,
  FileContentDto,
  FileNodeDto,
  MoveFileDto,
  UpdateAgentDto,
  WriteFileDto,
} from '@forepath/framework/backend/feature-agent-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { ClientsController } from './clients.controller';
import { ClientResponseDto } from './dto/client-response.dto';
import { CreateClientResponseDto } from './dto/create-client-response.dto';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { AuthenticationType } from './entities/client.entity';
import { ClientAgentFileSystemProxyService } from './services/client-agent-file-system-proxy.service';
import { ClientAgentProxyService } from './services/client-agent-proxy.service';
import { ClientsService } from './services/clients.service';

describe('ClientsController', () => {
  let controller: ClientsController;
  let service: jest.Mocked<ClientsService>;
  let proxyService: jest.Mocked<ClientAgentProxyService>;
  let fileSystemProxyService: jest.Mocked<ClientAgentFileSystemProxyService>;

  const mockClientResponse: ClientResponseDto = {
    id: 'test-uuid',
    name: 'Test Client',
    description: 'Test Description',
    endpoint: 'https://example.com/api',
    authenticationType: AuthenticationType.API_KEY,
    config: {
      gitRepositoryUrl: 'https://github.com/user/repo.git',
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockCreateClientResponse: CreateClientResponseDto = {
    ...mockClientResponse,
    apiKey: 'generated-api-key-123',
  };

  const mockAgentResponse: AgentResponseDto = {
    id: 'agent-uuid',
    name: 'Test Agent',
    description: 'Test Agent Description',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockCreateAgentResponse: CreateAgentResponseDto = {
    ...mockAgentResponse,
    password: 'generated-password-123',
  };

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockProxyService = {
    getClientAgents: jest.fn(),
    getClientAgent: jest.fn(),
    createClientAgent: jest.fn(),
    updateClientAgent: jest.fn(),
    deleteClientAgent: jest.fn(),
    getClientConfig: jest.fn(),
  };

  const mockFileSystemProxyService = {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    listDirectory: jest.fn(),
    createFileOrDirectory: jest.fn(),
    deleteFileOrDirectory: jest.fn(),
    moveFileOrDirectory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientsController],
      providers: [
        {
          provide: ClientsService,
          useValue: mockService,
        },
        {
          provide: ClientAgentProxyService,
          useValue: mockProxyService,
        },
        {
          provide: ClientAgentFileSystemProxyService,
          useValue: mockFileSystemProxyService,
        },
      ],
    }).compile();

    controller = module.get<ClientsController>(ClientsController);
    service = module.get(ClientsService);
    proxyService = module.get(ClientAgentProxyService);
    fileSystemProxyService = module.get(ClientAgentFileSystemProxyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getClients', () => {
    it('should return array of clients', async () => {
      const clients = [mockClientResponse];
      service.findAll.mockResolvedValue(clients);

      const result = await controller.getClients(10, 0);

      expect(result).toEqual(clients);
      expect(service.findAll).toHaveBeenCalledWith(10, 0);
    });

    it('should use default pagination values', async () => {
      const clients = [mockClientResponse];
      service.findAll.mockResolvedValue(clients);

      const result = await controller.getClients();

      expect(result).toEqual(clients);
      expect(service.findAll).toHaveBeenCalledWith(10, 0);
    });
  });

  describe('getClient', () => {
    it('should return single client', async () => {
      service.findOne.mockResolvedValue(mockClientResponse);

      const result = await controller.getClient('test-uuid');

      expect(result).toEqual(mockClientResponse);
      expect(service.findOne).toHaveBeenCalledWith('test-uuid');
    });
  });

  describe('createClient', () => {
    it('should create new client with auto-generated API key for API_KEY type', async () => {
      const createDto: CreateClientDto = {
        name: 'New Client',
        description: 'New Description',
        endpoint: 'https://example.com/api',
        authenticationType: AuthenticationType.API_KEY,
      };

      service.create.mockResolvedValue(mockCreateClientResponse);

      const result = await controller.createClient(createDto);

      expect(result).toEqual(mockCreateClientResponse);
      expect(result.apiKey).toBeDefined();
      expect(service.create).toHaveBeenCalledWith(createDto);
    });

    it('should create new client with Keycloak credentials for KEYCLOAK type', async () => {
      const createDto: CreateClientDto = {
        name: 'New Client',
        endpoint: 'https://example.com/api',
        authenticationType: AuthenticationType.KEYCLOAK,
        keycloakClientId: 'keycloak-client-id',
        keycloakClientSecret: 'keycloak-client-secret',
        keycloakRealm: 'test-realm',
      };
      const responseWithoutApiKey: CreateClientResponseDto = {
        ...mockClientResponse,
        authenticationType: AuthenticationType.KEYCLOAK,
        apiKey: undefined,
      };

      service.create.mockResolvedValue(responseWithoutApiKey);

      const result = await controller.createClient(createDto);

      expect(result).toEqual(responseWithoutApiKey);
      expect(result.apiKey).toBeUndefined();
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('updateClient', () => {
    it('should update client', async () => {
      const updateDto: UpdateClientDto = {
        name: 'Updated Client',
      };

      service.update.mockResolvedValue(mockClientResponse);

      const result = await controller.updateClient('test-uuid', updateDto);

      expect(result).toEqual(mockClientResponse);
      expect(service.update).toHaveBeenCalledWith('test-uuid', updateDto);
    });
  });

  describe('deleteClient', () => {
    it('should delete client', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.deleteClient('test-uuid');

      expect(service.remove).toHaveBeenCalledWith('test-uuid');
    });
  });

  describe('getClientAgents', () => {
    it('should return array of agents for a client', async () => {
      const agents = [mockAgentResponse];
      proxyService.getClientAgents.mockResolvedValue(agents);

      const result = await controller.getClientAgents('client-uuid', 10, 0);

      expect(result).toEqual(agents);
      expect(proxyService.getClientAgents).toHaveBeenCalledWith('client-uuid', 10, 0);
    });

    it('should use default pagination values', async () => {
      const agents = [mockAgentResponse];
      proxyService.getClientAgents.mockResolvedValue(agents);

      const result = await controller.getClientAgents('client-uuid');

      expect(result).toEqual(agents);
      expect(proxyService.getClientAgents).toHaveBeenCalledWith('client-uuid', 10, 0);
    });
  });

  describe('getClientAgent', () => {
    it('should return single agent for a client', async () => {
      proxyService.getClientAgent.mockResolvedValue(mockAgentResponse);

      const result = await controller.getClientAgent('client-uuid', 'agent-uuid');

      expect(result).toEqual(mockAgentResponse);
      expect(proxyService.getClientAgent).toHaveBeenCalledWith('client-uuid', 'agent-uuid');
    });
  });

  describe('createClientAgent', () => {
    it('should create new agent for a client', async () => {
      const createDto: CreateAgentDto = {
        name: 'New Agent',
        description: 'New Agent Description',
      };

      proxyService.createClientAgent.mockResolvedValue(mockCreateAgentResponse);

      const result = await controller.createClientAgent('client-uuid', createDto);

      expect(result).toEqual(mockCreateAgentResponse);
      expect(proxyService.createClientAgent).toHaveBeenCalledWith('client-uuid', createDto);
    });
  });

  describe('updateClientAgent', () => {
    it('should update agent for a client', async () => {
      const updateDto: UpdateAgentDto = {
        name: 'Updated Agent',
      };

      proxyService.updateClientAgent.mockResolvedValue(mockAgentResponse);

      const result = await controller.updateClientAgent('client-uuid', 'agent-uuid', updateDto);

      expect(result).toEqual(mockAgentResponse);
      expect(proxyService.updateClientAgent).toHaveBeenCalledWith('client-uuid', 'agent-uuid', updateDto);
    });
  });

  describe('deleteClientAgent', () => {
    it('should delete agent for a client', async () => {
      proxyService.deleteClientAgent.mockResolvedValue(undefined);

      await controller.deleteClientAgent('client-uuid', 'agent-uuid');

      expect(proxyService.deleteClientAgent).toHaveBeenCalledWith('client-uuid', 'agent-uuid');
    });
  });

  describe('readFile', () => {
    it('should proxy read file request', async () => {
      const mockFileContent: FileContentDto = {
        content: Buffer.from('Hello, World!', 'utf-8').toString('base64'),
        encoding: 'utf-8',
      };
      fileSystemProxyService.readFile.mockResolvedValue(mockFileContent);

      const result = await controller.readFile('client-uuid', 'agent-uuid', 'test.txt');

      expect(result).toEqual(mockFileContent);
      expect(fileSystemProxyService.readFile).toHaveBeenCalledWith('client-uuid', 'agent-uuid', 'test.txt');
    });
  });

  describe('writeFile', () => {
    it('should proxy write file request', async () => {
      const writeDto: WriteFileDto = {
        content: Buffer.from('New content', 'utf-8').toString('base64'),
        encoding: 'utf-8',
      };
      fileSystemProxyService.writeFile.mockResolvedValue(undefined);

      await controller.writeFile('client-uuid', 'agent-uuid', 'test.txt', writeDto);

      expect(fileSystemProxyService.writeFile).toHaveBeenCalledWith('client-uuid', 'agent-uuid', 'test.txt', writeDto);
    });
  });

  describe('listDirectory', () => {
    it('should proxy list directory request', async () => {
      const mockFileNodes: FileNodeDto[] = [
        {
          name: 'file1.txt',
          type: 'file',
          path: 'file1.txt',
          size: 1024,
          modifiedAt: new Date('2024-01-01'),
        },
      ];
      fileSystemProxyService.listDirectory.mockResolvedValue(mockFileNodes);

      const result = await controller.listDirectory('client-uuid', 'agent-uuid', 'test-dir');

      expect(result).toEqual(mockFileNodes);
      expect(fileSystemProxyService.listDirectory).toHaveBeenCalledWith('client-uuid', 'agent-uuid', 'test-dir');
    });

    it('should use default path when not provided', async () => {
      const mockFileNodes: FileNodeDto[] = [];
      fileSystemProxyService.listDirectory.mockResolvedValue(mockFileNodes);

      await controller.listDirectory('client-uuid', 'agent-uuid');

      expect(fileSystemProxyService.listDirectory).toHaveBeenCalledWith('client-uuid', 'agent-uuid', '.');
    });
  });

  describe('createFileOrDirectory', () => {
    it('should proxy create file request', async () => {
      const createDto: CreateFileDto = {
        type: 'file',
        content: Buffer.from('File content', 'utf-8').toString('base64'),
      };
      fileSystemProxyService.createFileOrDirectory.mockResolvedValue(undefined);

      await controller.createFileOrDirectory('client-uuid', 'agent-uuid', 'new-file.txt', createDto);

      expect(fileSystemProxyService.createFileOrDirectory).toHaveBeenCalledWith(
        'client-uuid',
        'agent-uuid',
        'new-file.txt',
        createDto,
      );
    });

    it('should proxy create directory request', async () => {
      const createDto: CreateFileDto = {
        type: 'directory',
      };
      fileSystemProxyService.createFileOrDirectory.mockResolvedValue(undefined);

      await controller.createFileOrDirectory('client-uuid', 'agent-uuid', 'new-dir', createDto);

      expect(fileSystemProxyService.createFileOrDirectory).toHaveBeenCalledWith(
        'client-uuid',
        'agent-uuid',
        'new-dir',
        createDto,
      );
    });

    it('should handle array path parameter', async () => {
      const createDto: CreateFileDto = {
        type: 'file',
        content: Buffer.from('File content', 'utf-8').toString('base64'),
      };
      fileSystemProxyService.createFileOrDirectory.mockResolvedValue(undefined);

      await controller.createFileOrDirectory('client-uuid', 'agent-uuid', ['nested', 'path', 'file.txt'], createDto);

      expect(fileSystemProxyService.createFileOrDirectory).toHaveBeenCalledWith(
        'client-uuid',
        'agent-uuid',
        'nested/path/file.txt',
        createDto,
      );
    });

    it('should throw BadRequestException when path is undefined', async () => {
      const createDto: CreateFileDto = {
        type: 'file',
        content: Buffer.from('File content', 'utf-8').toString('base64'),
      };

      await expect(controller.createFileOrDirectory('client-uuid', 'agent-uuid', undefined, createDto)).rejects.toThrow(
        'File path is required',
      );
    });

    it('should throw BadRequestException when path is an object', async () => {
      const createDto: CreateFileDto = {
        type: 'file',
        content: Buffer.from('File content', 'utf-8').toString('base64'),
      };

      await expect(
        controller.createFileOrDirectory('client-uuid', 'agent-uuid', { invalid: 'path' }, createDto),
      ).rejects.toThrow('File path must be a string or array, got object');
    });
  });

  describe('deleteFileOrDirectory', () => {
    it('should proxy delete file request', async () => {
      fileSystemProxyService.deleteFileOrDirectory.mockResolvedValue(undefined);

      await controller.deleteFileOrDirectory('client-uuid', 'agent-uuid', 'file-to-delete.txt');

      expect(fileSystemProxyService.deleteFileOrDirectory).toHaveBeenCalledWith(
        'client-uuid',
        'agent-uuid',
        'file-to-delete.txt',
      );
    });
  });

  describe('moveFileOrDirectory', () => {
    it('should proxy move file request', async () => {
      const moveDto: MoveFileDto = {
        destination: 'new-location/file.txt',
      };
      fileSystemProxyService.moveFileOrDirectory.mockResolvedValue(undefined);

      await controller.moveFileOrDirectory('client-uuid', 'agent-uuid', 'source-file.txt', moveDto);

      expect(fileSystemProxyService.moveFileOrDirectory).toHaveBeenCalledWith(
        'client-uuid',
        'agent-uuid',
        'source-file.txt',
        moveDto,
      );
    });

    it('should handle array path parameter', async () => {
      const moveDto: MoveFileDto = {
        destination: 'new-location/file.txt',
      };
      fileSystemProxyService.moveFileOrDirectory.mockResolvedValue(undefined);

      await controller.moveFileOrDirectory('client-uuid', 'agent-uuid', ['nested', 'path', 'file.txt'], moveDto);

      expect(fileSystemProxyService.moveFileOrDirectory).toHaveBeenCalledWith(
        'client-uuid',
        'agent-uuid',
        'nested/path/file.txt',
        moveDto,
      );
    });

    it('should throw BadRequestException when path is undefined', async () => {
      const moveDto: MoveFileDto = {
        destination: 'new-location/file.txt',
      };

      await expect(controller.moveFileOrDirectory('client-uuid', 'agent-uuid', undefined, moveDto)).rejects.toThrow(
        'File path is required',
      );
    });

    it('should throw BadRequestException when path is an object', async () => {
      const moveDto: MoveFileDto = {
        destination: 'new-location/file.txt',
      };

      await expect(
        controller.moveFileOrDirectory('client-uuid', 'agent-uuid', { invalid: 'path' }, moveDto),
      ).rejects.toThrow('File path must be a string or array, got object');
    });

    it('should throw BadRequestException when destination is missing', async () => {
      const moveDto: MoveFileDto = {
        destination: '',
      };

      await expect(controller.moveFileOrDirectory('client-uuid', 'agent-uuid', 'source.txt', moveDto)).rejects.toThrow(
        'Destination path is required',
      );
    });
  });
});
