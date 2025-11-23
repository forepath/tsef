import { Test, TestingModule } from '@nestjs/testing';
import { DockerService } from '../services/docker.service';
import { CursorAgentProvider } from './cursor-agent.provider';

describe('CursorAgentProvider', () => {
  let provider: CursorAgentProvider;
  let dockerService: jest.Mocked<DockerService>;

  const mockDockerService = {
    sendCommandToContainer: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CursorAgentProvider,
        {
          provide: DockerService,
          useValue: mockDockerService,
        },
      ],
    }).compile();

    provider = module.get<CursorAgentProvider>(CursorAgentProvider);
    dockerService = module.get(DockerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.CURSOR_AGENT_DOCKER_IMAGE;
  });

  describe('getType', () => {
    it('should return "cursor"', () => {
      expect(provider.getType()).toBe('cursor');
    });
  });

  describe('getDisplayName', () => {
    it('should return "Cursor"', () => {
      expect(provider.getDisplayName()).toBe('Cursor');
    });
  });

  describe('getDockerImage', () => {
    it('should return default image when CURSOR_AGENT_DOCKER_IMAGE is not set', () => {
      delete process.env.CURSOR_AGENT_DOCKER_IMAGE;

      const image = provider.getDockerImage();

      expect(image).toBe('ghcr.io/forepath/agenstra-manager-worker:latest');
    });

    it('should return custom image from CURSOR_AGENT_DOCKER_IMAGE environment variable', () => {
      process.env.CURSOR_AGENT_DOCKER_IMAGE = 'custom-registry/custom-image:v1.0.0';

      const image = provider.getDockerImage();

      expect(image).toBe('custom-registry/custom-image:v1.0.0');
    });
  });

  describe('sendMessage', () => {
    const agentId = 'test-agent-id';
    const containerId = 'test-container-id';
    const message = 'Hello, agent!';

    it('should send message to container without model option', async () => {
      const expectedResponse = '{"type":"result","result":"Hello from agent!"}';
      dockerService.sendCommandToContainer.mockResolvedValue(expectedResponse);

      const response = await provider.sendMessage(agentId, containerId, message);

      expect(response).toBe(expectedResponse);
      expect(dockerService.sendCommandToContainer).toHaveBeenCalledWith(
        containerId,
        `cursor-agent --print --approve-mcps --force --output-format json --resume ${agentId}-${containerId}`,
        message,
      );
    });

    it('should send message to container with model option', async () => {
      const expectedResponse = '{"type":"result","result":"Hello from agent!"}';
      const model = 'gpt-4';
      dockerService.sendCommandToContainer.mockResolvedValue(expectedResponse);

      const response = await provider.sendMessage(agentId, containerId, message, { model });

      expect(response).toBe(expectedResponse);
      expect(dockerService.sendCommandToContainer).toHaveBeenCalledWith(
        containerId,
        `cursor-agent --print --approve-mcps --force --output-format json --resume ${agentId}-${containerId} --model ${model}`,
        message,
      );
    });

    it('should handle errors from docker service', async () => {
      const error = new Error('Container not found');
      dockerService.sendCommandToContainer.mockRejectedValue(error);

      await expect(provider.sendMessage(agentId, containerId, message)).rejects.toThrow('Container not found');
    });
  });

  describe('sendInitialization', () => {
    const agentId = 'test-agent-id';
    const containerId = 'test-container-id';

    it('should send initialization message without model option', async () => {
      const loggerDebugSpy = jest.spyOn(provider['logger'], 'debug').mockImplementation();
      dockerService.sendCommandToContainer.mockResolvedValue('');

      await provider.sendInitialization(agentId, containerId);

      expect(dockerService.sendCommandToContainer).toHaveBeenCalledWith(
        containerId,
        `cursor-agent --print --approve-mcps --force --output-format json --resume ${agentId}-${containerId}`,
        expect.stringContaining('You are operating in a codebase with a structured command and rules system'),
      );
      expect(loggerDebugSpy).toHaveBeenCalledWith(`Sent initialization message to agent ${agentId}`);

      loggerDebugSpy.mockRestore();
    });

    it('should send initialization message with model option', async () => {
      const loggerDebugSpy = jest.spyOn(provider['logger'], 'debug').mockImplementation();
      const model = 'gpt-4';
      dockerService.sendCommandToContainer.mockResolvedValue('');

      await provider.sendInitialization(agentId, containerId, { model });

      expect(dockerService.sendCommandToContainer).toHaveBeenCalledWith(
        containerId,
        `cursor-agent --print --approve-mcps --force --output-format json --resume ${agentId}-${containerId} --model ${model}`,
        expect.stringContaining('You are operating in a codebase with a structured command and rules system'),
      );
      expect(loggerDebugSpy).toHaveBeenCalledWith(`Sent initialization message to agent ${agentId}`);

      loggerDebugSpy.mockRestore();
    });

    it('should include command system instructions in initialization message', async () => {
      dockerService.sendCommandToContainer.mockResolvedValue('');

      await provider.sendInitialization(agentId, containerId);

      const callArgs = dockerService.sendCommandToContainer.mock.calls[0];
      const instructions = callArgs[2] as string;

      expect(instructions).toContain('COMMAND SYSTEM');
      expect(instructions).toContain('.cursor/commands');
      expect(instructions).toContain('/{filenamewithoutextension}');
    });

    it('should include rules system instructions in initialization message', async () => {
      dockerService.sendCommandToContainer.mockResolvedValue('');

      await provider.sendInitialization(agentId, containerId);

      const callArgs = dockerService.sendCommandToContainer.mock.calls[0];
      const instructions = callArgs[2] as string;

      expect(instructions).toContain('RULES SYSTEM');
      expect(instructions).toContain('.cursor/rules');
      expect(instructions).toContain('alwaysApply');
    });

    it('should include message handling instructions in initialization message', async () => {
      dockerService.sendCommandToContainer.mockResolvedValue('');

      await provider.sendInitialization(agentId, containerId);

      const callArgs = dockerService.sendCommandToContainer.mock.calls[0];
      const instructions = callArgs[2] as string;

      expect(instructions).toContain('MESSAGE HANDLING');
      expect(instructions).toContain('one-time initialization message');
    });

    it('should log warning and re-throw error on failure', async () => {
      const loggerWarnSpy = jest.spyOn(provider['logger'], 'warn').mockImplementation();
      const error = new Error('Container error');
      dockerService.sendCommandToContainer.mockRejectedValue(error);

      await expect(provider.sendInitialization(agentId, containerId)).rejects.toThrow('Container error');

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        `Failed to send initialization message to agent ${agentId}: Container error`,
        expect.any(String), // Error stack trace
      );

      loggerWarnSpy.mockRestore();
    });

    it('should log warning with stack trace when error has stack', async () => {
      const loggerWarnSpy = jest.spyOn(provider['logger'], 'warn').mockImplementation();
      const error = new Error('Container error');
      error.stack = 'Error stack trace';
      dockerService.sendCommandToContainer.mockRejectedValue(error);

      await expect(provider.sendInitialization(agentId, containerId)).rejects.toThrow('Container error');

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        `Failed to send initialization message to agent ${agentId}: Container error`,
        'Error stack trace',
      );

      loggerWarnSpy.mockRestore();
    });
  });
});
