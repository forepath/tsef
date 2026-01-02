import { Test, TestingModule } from '@nestjs/testing';
import { DockerService } from '../../services/docker.service';
import { OpenCodeAgentProvider } from './opencode-agent.provider';

describe('OpenCodeAgentProvider', () => {
  let provider: OpenCodeAgentProvider;
  let dockerService: jest.Mocked<DockerService>;

  const mockDockerService = {
    sendCommandToContainer: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenCodeAgentProvider,
        {
          provide: DockerService,
          useValue: mockDockerService,
        },
      ],
    }).compile();

    provider = module.get<OpenCodeAgentProvider>(OpenCodeAgentProvider);
    dockerService = module.get(DockerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.OPENCODE_AGENT_DOCKER_IMAGE;
    delete process.env.OPENCODE_AGENT_VIRTUAL_WORKSPACE_DOCKER_IMAGE;
    delete process.env.OPENCODE_AGENT_SSH_CONNECTION_DOCKER_IMAGE;
  });

  describe('getType', () => {
    it('should return "opencode"', () => {
      expect(provider.getType()).toBe('opencode');
    });
  });

  describe('getDisplayName', () => {
    it('should return "OpenCode"', () => {
      expect(provider.getDisplayName()).toBe('OpenCode');
    });
  });

  describe('getDockerImage', () => {
    it('should return default image when OPENCODE_AGENT_DOCKER_IMAGE is not set', () => {
      delete process.env.OPENCODE_AGENT_DOCKER_IMAGE;

      const image = provider.getDockerImage();

      expect(image).toBe('ghcr.io/forepath/agenstra-manager-worker:latest');
    });

    it('should return custom image from OPENCODE_AGENT_DOCKER_IMAGE environment variable', () => {
      process.env.OPENCODE_AGENT_DOCKER_IMAGE = 'custom-registry/custom-image:v1.0.0';

      const image = provider.getDockerImage();

      expect(image).toBe('custom-registry/custom-image:v1.0.0');
    });
  });

  describe('getVirtualWorkspaceDockerImage', () => {
    it('should return default image when OPENCODE_AGENT_VIRTUAL_WORKSPACE_DOCKER_IMAGE is not set', () => {
      delete process.env.OPENCODE_AGENT_VIRTUAL_WORKSPACE_DOCKER_IMAGE;

      const image = provider.getVirtualWorkspaceDockerImage();

      expect(image).toBe('ghcr.io/forepath/agenstra-manager-vnc:latest');
    });

    it('should return custom image from OPENCODE_AGENT_VIRTUAL_WORKSPACE_DOCKER_IMAGE environment variable', () => {
      process.env.OPENCODE_AGENT_VIRTUAL_WORKSPACE_DOCKER_IMAGE = 'custom-registry/custom-vnc:v1.0.0';

      const image = provider.getVirtualWorkspaceDockerImage();

      expect(image).toBe('custom-registry/custom-vnc:v1.0.0');
    });
  });

  describe('getSshConnectionDockerImage', () => {
    it('should return default image when OPENCODE_AGENT_SSH_CONNECTION_DOCKER_IMAGE is not set', () => {
      delete process.env.OPENCODE_AGENT_SSH_CONNECTION_DOCKER_IMAGE;

      const image = provider.getSshConnectionDockerImage();

      expect(image).toBe('ghcr.io/forepath/agenstra-manager-ssh:latest');
    });

    it('should return custom image from OPENCODE_AGENT_SSH_CONNECTION_DOCKER_IMAGE environment variable', () => {
      process.env.OPENCODE_AGENT_SSH_CONNECTION_DOCKER_IMAGE = 'custom-registry/custom-ssh:v1.0.0';

      const image = provider.getSshConnectionDockerImage();

      expect(image).toBe('custom-registry/custom-ssh:v1.0.0');
    });
  });

  describe('sendMessage', () => {
    const agentId = 'test-agent-id';
    const containerId = 'test-container-id';
    const message = 'Hello, agent!';

    it('should send message to container without model option', async () => {
      const expectedResponse = 'Hello from agent!';
      dockerService.sendCommandToContainer.mockResolvedValue(expectedResponse);

      const response = await provider.sendMessage(agentId, containerId, message);

      expect(response).toBe(expectedResponse);
      expect(dockerService.sendCommandToContainer).toHaveBeenCalledWith(
        containerId,
        'opencode run --continue',
        message,
      );
    });

    it('should send message to container with model option', async () => {
      const expectedResponse = 'Hello from agent!';
      const model = 'gpt-4';
      dockerService.sendCommandToContainer.mockResolvedValue(expectedResponse);

      const response = await provider.sendMessage(agentId, containerId, message, { model });

      expect(response).toBe(expectedResponse);
      expect(dockerService.sendCommandToContainer).toHaveBeenCalledWith(
        containerId,
        `opencode run --continue --model ${model}`,
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

    it('should return immediately without sending any command', async () => {
      await provider.sendInitialization(agentId, containerId);

      expect(dockerService.sendCommandToContainer).not.toHaveBeenCalled();
    });

    it('should return immediately even with model option', async () => {
      const model = 'gpt-4';
      await provider.sendInitialization(agentId, containerId, { model });

      expect(dockerService.sendCommandToContainer).not.toHaveBeenCalled();
    });

    it('should not throw errors', async () => {
      await expect(provider.sendInitialization(agentId, containerId)).resolves.toBeUndefined();
    });
  });

  describe('toParseableString', () => {
    it('should trim whitespace from response', () => {
      const response = '   Hello, world!   ';
      const result = provider.toParseableString(response);

      expect(result).toBe('Hello, world!');
    });

    it('should return response unchanged if no whitespace', () => {
      const response = 'Hello, world!';
      const result = provider.toParseableString(response);

      expect(result).toBe('Hello, world!');
    });

    it('should handle response with only leading whitespace', () => {
      const response = '   Hello, world!';
      const result = provider.toParseableString(response);

      expect(result).toBe('Hello, world!');
    });

    it('should handle response with only trailing whitespace', () => {
      const response = 'Hello, world!   ';
      const result = provider.toParseableString(response);

      expect(result).toBe('Hello, world!');
    });

    it('should handle response with newlines and tabs', () => {
      const response = '\n\tHello, world!\n\t';
      const result = provider.toParseableString(response);

      expect(result).toBe('Hello, world!');
    });

    it('should handle empty string', () => {
      const response = '';
      const result = provider.toParseableString(response);

      expect(result).toBe('');
    });

    it('should handle response with only whitespace', () => {
      const response = '   \n\t   ';
      const result = provider.toParseableString(response);

      expect(result).toBe('');
    });

    it('should preserve content with internal whitespace', () => {
      const response = '  Hello,   world!  ';
      const result = provider.toParseableString(response);

      expect(result).toBe('Hello,   world!');
    });

    it('should handle JSON strings', () => {
      const response = '  {"type":"result","result":"Hello"}  ';
      const result = provider.toParseableString(response);

      expect(result).toBe('{"type":"result","result":"Hello"}');
    });

    it('should handle multiline responses', () => {
      const response = '\n  Line 1\n  Line 2\n  ';
      const result = provider.toParseableString(response);

      expect(result).toBe('Line 1\n  Line 2');
    });
  });

  describe('toUnifiedResponse', () => {
    it('should wrap plain text message in standard response object', () => {
      const response = 'Hello from agent!';
      const result = provider.toUnifiedResponse(response);

      expect(result).toEqual({
        type: 'result',
        subtype: 'success',
        result: 'Hello from agent!',
      });
    });

    it('should trim whitespace from message before wrapping', () => {
      const response = '   Hello from agent!   ';
      const result = provider.toUnifiedResponse(response);

      expect(result).toEqual({
        type: 'result',
        subtype: 'success',
        result: 'Hello from agent!',
      });
    });

    it('should handle JSON string as plain text', () => {
      const response = '{"type":"result","result":"Hello"}';
      const result = provider.toUnifiedResponse(response);

      expect(result).toEqual({
        type: 'result',
        subtype: 'success',
        result: '{"type":"result","result":"Hello"}',
      });
    });

    it('should handle empty string', () => {
      const response = '';
      const result = provider.toUnifiedResponse(response);

      expect(result).toEqual({
        type: 'result',
        subtype: 'success',
        result: '',
      });
    });

    it('should handle multiline messages', () => {
      const response = 'Line 1\nLine 2\nLine 3';
      const result = provider.toUnifiedResponse(response);

      expect(result).toEqual({
        type: 'result',
        subtype: 'success',
        result: 'Line 1\nLine 2\nLine 3',
      });
    });

    it('should handle messages with special characters', () => {
      const response = 'Hello! @#$%^&*()_+-=[]{}|;:,.<>?';
      const result = provider.toUnifiedResponse(response);

      expect(result).toEqual({
        type: 'result',
        subtype: 'success',
        result: 'Hello! @#$%^&*()_+-=[]{}|;:,.<>?',
      });
    });

    it('should handle messages with unicode characters', () => {
      const response = 'Hello 世界 🌍';
      const result = provider.toUnifiedResponse(response);

      expect(result).toEqual({
        type: 'result',
        subtype: 'success',
        result: 'Hello 世界 🌍',
      });
    });

    it('should always return type "result"', () => {
      const response = 'Any message';
      const result = provider.toUnifiedResponse(response);

      expect(result.type).toBe('result');
    });

    it('should always return subtype "success"', () => {
      const response = 'Any message';
      const result = provider.toUnifiedResponse(response);

      expect(result.subtype).toBe('success');
    });

    it('should handle very long messages', () => {
      const response = 'A'.repeat(10000);
      const result = provider.toUnifiedResponse(response);

      expect(result).toEqual({
        type: 'result',
        subtype: 'success',
        result: 'A'.repeat(10000),
      });
      expect(result.result.length).toBe(10000);
    });

    it('should handle messages with only whitespace', () => {
      const response = '   \n\t   ';
      const result = provider.toUnifiedResponse(response);

      expect(result).toEqual({
        type: 'result',
        subtype: 'success',
        result: '',
      });
    });
  });
});
