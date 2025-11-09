import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DockerService } from './docker.service';
import Docker = require('dockerode');

// Mock dockerode
jest.mock('dockerode');

describe('DockerService', () => {
  let service: DockerService;
  let mockDocker: jest.Mocked<Docker>;
  let mockContainer: {
    inspect: jest.Mock;
    logs: jest.Mock;
    exec: jest.Mock;
    stop: jest.Mock;
    remove: jest.Mock;
  };
  let mockExec: {
    start: jest.Mock;
  };
  let mockStream: NodeJS.ReadWriteStream;

  beforeEach(async () => {
    // Create mock stream
    mockStream = {
      write: jest.fn(),
      end: jest.fn(),
      on: jest.fn((event: string, callback: () => void) => {
        // Simulate stream end after a short delay for testing
        if (event === 'end') {
          setTimeout(() => callback(), 10);
        }
        return mockStream;
      }),
      once: jest.fn(),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn(),
      setMaxListeners: jest.fn(),
      getMaxListeners: jest.fn(),
      listeners: jest.fn(),
      rawListeners: jest.fn(),
      emit: jest.fn(),
      listenerCount: jest.fn(),
      prependListener: jest.fn(),
      prependOnceListener: jest.fn(),
      eventNames: jest.fn(),
      pipe: jest.fn(),
      unpipe: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      isPaused: jest.fn(),
      unshift: jest.fn(),
      read: jest.fn(),
      setEncoding: jest.fn(),
      destroy: jest.fn(),
      [Symbol.asyncIterator]: jest.fn(),
    } as any;

    // Create mock exec
    mockExec = {
      start: jest.fn().mockResolvedValue(mockStream),
    };

    // Create mock container
    mockContainer = {
      inspect: jest.fn(),
      logs: jest.fn(),
      exec: jest.fn().mockResolvedValue(mockExec),
      stop: jest.fn(),
      remove: jest.fn(),
    };

    // Create mock Docker instance
    mockDocker = {
      getContainer: jest.fn().mockReturnValue(mockContainer),
    } as any;

    // Mock Docker constructor
    (Docker as jest.MockedClass<typeof Docker>).mockImplementation(() => mockDocker);

    const module: TestingModule = await Test.createTestingModule({
      providers: [DockerService],
    }).compile();

    service = module.get<DockerService>(DockerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createContainer', () => {
    let createdContainer: { start: jest.Mock; id: string };

    beforeEach(() => {
      createdContainer = { start: jest.fn().mockResolvedValue(undefined), id: 'abc123' } as any;
      (mockDocker as any).createContainer = jest.fn().mockResolvedValue(createdContainer);
      (mockDocker as any).pull = jest.fn((image: string, cb: (err: unknown, stream: any) => void) => {
        // Simulate immediate success
        const fakeStream = {} as any;
        cb(null, fakeStream);
        // Simulate followProgress callback
        (mockDocker as any).modem = {
          followProgress: (_s: any, done: (err?: unknown) => void) => done(),
        } as any;
      });
    });

    it('should pull image, create and start container with binds and ports', async () => {
      const result = await service.createContainer({
        image: 'node:22-alpine',
        env: { FOO: 'bar' },
        volumes: [
          { hostPath: '/host/a', containerPath: '/cnt/a' },
          { hostPath: '/host/b', containerPath: '/cnt/b', readOnly: true },
        ],
        ports: [
          { containerPort: 3000, hostPort: 3001 },
          { containerPort: 9229, protocol: 'tcp' },
        ],
      });

      expect((mockDocker as any).pull).toHaveBeenCalledWith('node:22-alpine', expect.any(Function));
      expect((mockDocker as any).createContainer).toHaveBeenCalledWith({
        Image: 'node:22-alpine',
        Env: ['FOO=bar'],
        ExposedPorts: {
          '3000/tcp': {},
          '9229/tcp': {},
        },
        HostConfig: {
          Binds: ['/host/a:/cnt/a', '/host/b:/cnt/b:ro'],
          PortBindings: {
            '3000/tcp': [{ HostPort: '3001' }],
            '9229/tcp': [{ HostPort: undefined }],
          },
          AutoRemove: false,
        },
      });
      expect(createdContainer.start).toHaveBeenCalled();
      expect(result).toBe('abc123');
    });

    it('should use env default image when image not provided', async () => {
      (mockDocker as any).createContainer = jest.fn().mockResolvedValue(createdContainer);
      const original = process.env.AGENT_DEFAULT_IMAGE;
      process.env.AGENT_DEFAULT_IMAGE = 'env/image:latest';
      try {
        const result = await service.createContainer({ volumes: [], ports: [] });
        expect((mockDocker as any).pull).toHaveBeenCalledWith('env/image:latest', expect.any(Function));
        expect(result).toBe('abc123');
      } finally {
        process.env.AGENT_DEFAULT_IMAGE = original;
      }
    });

    it('should proceed if pulling image fails (image exists locally)', async () => {
      (mockDocker as any).pull = jest.fn((_image: string, cb: (err: unknown, stream?: any) => void) => {
        cb(new Error('pull failed'));
      });
      (mockDocker as any).createContainer = jest.fn().mockResolvedValue(createdContainer);

      const result = await service.createContainer({ image: 'local/image:tag' });
      expect((mockDocker as any).createContainer).toHaveBeenCalled();
      expect(result).toBe('abc123');
    });

    it('should quote env values that contain whitespace', async () => {
      await service.createContainer({
        image: 'node:22-alpine',
        env: { FOO: 'hello world' },
      });

      expect((mockDocker as any).createContainer).toHaveBeenCalledWith(
        expect.objectContaining({ Env: ['FOO="hello world"'] }),
      );
    });

    it('should escape inner quotes and wrap in double quotes', async () => {
      await service.createContainer({
        image: 'node:22-alpine',
        env: { FOO: 'he said "hi"' },
      });

      expect((mockDocker as any).createContainer).toHaveBeenCalledWith(
        expect.objectContaining({ Env: ['FOO="he said \\"hi\\""'] }),
      );
    });

    it('should escape backslashes, newlines, carriage returns and tabs', async () => {
      await service.createContainer({
        image: 'node:22-alpine',
        env: { PATHS: 'C:\\tools\nline2\rline3\tend' },
      });

      // Expected: backslashes doubled, \n, \r, \t visible; no quoting needed (no spaces/quotes)
      expect((mockDocker as any).createContainer).toHaveBeenCalledWith(
        expect.objectContaining({ Env: ['PATHS=C:\\\\tools\\nline2\\rline3\\tend'] }),
      );
    });

    it('should set empty string when env value is undefined', async () => {
      await service.createContainer({ image: 'node:22-alpine', env: { EMPTY: undefined } });
      expect((mockDocker as any).createContainer).toHaveBeenCalledWith(expect.objectContaining({ Env: ['EMPTY='] }));
    });
  });

  describe('deleteContainer', () => {
    const containerId = 'test-container-id';

    it('should throw NotFoundException when container does not exist', async () => {
      mockContainer.inspect.mockRejectedValue({ statusCode: 404 });

      await expect(service.deleteContainer(containerId)).rejects.toThrow(NotFoundException);
      expect(mockContainer.inspect).toHaveBeenCalled();
      expect(mockContainer.stop).not.toHaveBeenCalled();
      expect(mockContainer.remove).not.toHaveBeenCalled();
    });

    it('should stop and remove a running container', async () => {
      mockContainer.inspect.mockResolvedValue({
        State: { Running: true },
      });
      mockContainer.stop.mockResolvedValue(undefined);
      mockContainer.remove.mockResolvedValue(undefined);

      await service.deleteContainer(containerId);

      expect(mockContainer.inspect).toHaveBeenCalled();
      expect(mockContainer.stop).toHaveBeenCalled();
      expect(mockContainer.remove).toHaveBeenCalled();
    });

    it('should remove a stopped container without stopping', async () => {
      mockContainer.inspect.mockResolvedValue({
        State: { Running: false },
      });
      mockContainer.remove.mockResolvedValue(undefined);

      await service.deleteContainer(containerId);

      expect(mockContainer.inspect).toHaveBeenCalled();
      expect(mockContainer.stop).not.toHaveBeenCalled();
      expect(mockContainer.remove).toHaveBeenCalled();
    });

    it('should handle container with undefined state', async () => {
      mockContainer.inspect.mockResolvedValue({
        State: undefined,
      });
      mockContainer.remove.mockResolvedValue(undefined);

      await service.deleteContainer(containerId);

      expect(mockContainer.inspect).toHaveBeenCalled();
      expect(mockContainer.stop).not.toHaveBeenCalled();
      expect(mockContainer.remove).toHaveBeenCalled();
    });

    it('should continue with removal if stop fails with non-409 error', async () => {
      mockContainer.inspect.mockResolvedValue({
        State: { Running: true },
      });
      const stopError = new Error('Stop failed') as any;
      stopError.statusCode = 500;
      mockContainer.stop.mockRejectedValue(stopError);
      mockContainer.remove.mockResolvedValue(undefined);

      await service.deleteContainer(containerId);

      expect(mockContainer.stop).toHaveBeenCalled();
      expect(mockContainer.remove).toHaveBeenCalled();
    });

    it('should ignore 409 error when stopping (container already stopped)', async () => {
      mockContainer.inspect.mockResolvedValue({
        State: { Running: true },
      });
      const stopError = new Error('Container already stopped') as any;
      stopError.statusCode = 409;
      mockContainer.stop.mockRejectedValue(stopError);
      mockContainer.remove.mockResolvedValue(undefined);

      await service.deleteContainer(containerId);

      expect(mockContainer.stop).toHaveBeenCalled();
      expect(mockContainer.remove).toHaveBeenCalled();
    });

    it('should handle container already removed (404 on remove)', async () => {
      mockContainer.inspect.mockResolvedValue({
        State: { Running: false },
      });
      const removeError = new Error('Container not found') as any;
      removeError.statusCode = 404;
      mockContainer.remove.mockRejectedValue(removeError);

      await expect(service.deleteContainer(containerId)).resolves.not.toThrow();
      expect(mockContainer.remove).toHaveBeenCalled();
    });

    it('should force remove container if still running (409 on remove)', async () => {
      mockContainer.inspect.mockResolvedValue({
        State: { Running: true },
      });
      mockContainer.stop.mockResolvedValue(undefined);
      const removeError = new Error('Container is running') as any;
      removeError.statusCode = 409;
      mockContainer.remove.mockRejectedValueOnce(removeError).mockResolvedValueOnce(undefined);

      await service.deleteContainer(containerId);

      expect(mockContainer.remove).toHaveBeenCalledTimes(2);
      expect(mockContainer.remove).toHaveBeenNthCalledWith(1);
      expect(mockContainer.remove).toHaveBeenNthCalledWith(2, { force: true });
    });

    it('should throw error if force remove fails', async () => {
      mockContainer.inspect.mockResolvedValue({
        State: { Running: true },
      });
      mockContainer.stop.mockResolvedValue(undefined);
      const removeError = new Error('Container is running') as any;
      removeError.statusCode = 409;
      const forceError = new Error('Force remove failed') as any;
      mockContainer.remove.mockRejectedValueOnce(removeError).mockRejectedValueOnce(forceError);

      await expect(service.deleteContainer(containerId)).rejects.toThrow('Force remove failed');
      expect(mockContainer.remove).toHaveBeenCalledTimes(2);
    });

    it('should throw error on other remove errors', async () => {
      mockContainer.inspect.mockResolvedValue({
        State: { Running: false },
      });
      const removeError = new Error('Remove failed') as any;
      removeError.statusCode = 500;
      mockContainer.remove.mockRejectedValue(removeError);

      await expect(service.deleteContainer(containerId)).rejects.toThrow('Remove failed');
    });

    it('should handle container inspection errors other than 404', async () => {
      const error = new Error('Docker daemon error') as any;
      error.statusCode = 500;
      mockContainer.inspect.mockRejectedValue(error);

      await expect(service.deleteContainer(containerId)).rejects.toThrow('Docker daemon error');
      expect(mockContainer.stop).not.toHaveBeenCalled();
      expect(mockContainer.remove).not.toHaveBeenCalled();
    });

    it('should call getContainer with correct containerId', async () => {
      mockContainer.inspect.mockResolvedValue({
        State: { Running: false },
      });
      mockContainer.remove.mockResolvedValue(undefined);

      await service.deleteContainer(containerId);

      expect(mockDocker.getContainer).toHaveBeenCalledWith(containerId);
    });
  });

  describe('getContainerLogs', () => {
    const containerId = 'test-container-id';

    it('should throw NotFoundException when container does not exist', async () => {
      mockContainer.inspect.mockRejectedValue({ statusCode: 404 });

      const logsGenerator = service.getContainerLogs(containerId);
      await expect(async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _ of logsGenerator) {
          // Consume the generator to trigger the error
        }
      }).rejects.toThrow(NotFoundException);
      expect(mockContainer.inspect).toHaveBeenCalled();
    });

    it('should yield historical logs first', async () => {
      const historicalLogs = Buffer.from('line1\nline2\nline3\n');
      mockContainer.inspect.mockResolvedValue({});
      mockContainer.logs
        .mockResolvedValueOnce(historicalLogs) // Historical logs
        .mockResolvedValueOnce(Buffer.from('')); // Live logs (empty buffer)

      const logs: string[] = [];
      for await (const line of service.getContainerLogs(containerId)) {
        logs.push(line);
      }

      expect(logs).toEqual(['line1', 'line2', 'line3']);
      expect(mockContainer.logs).toHaveBeenCalledTimes(2);
      expect(mockContainer.logs).toHaveBeenNthCalledWith(1, {
        stdout: true,
        stderr: true,
        tail: 100,
        timestamps: false,
      });
    });

    it('should yield live logs after historical logs', async () => {
      const historicalLogs = Buffer.from('historical1\nhistorical2\n');
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield Buffer.from('live1\nlive2\n');
        },
      };

      mockContainer.inspect.mockResolvedValue({});
      mockContainer.logs.mockResolvedValueOnce(historicalLogs).mockReturnValueOnce(mockStream as any);

      const logs: string[] = [];
      for await (const line of service.getContainerLogs(containerId)) {
        logs.push(line);
      }

      expect(logs).toEqual(['historical1', 'historical2', 'live1', 'live2']);
      expect(mockContainer.logs).toHaveBeenNthCalledWith(2, {
        stdout: true,
        stderr: true,
        follow: true,
        tail: 0,
        timestamps: false,
      });
    });

    it('should handle live logs as a stream', async () => {
      const historicalLogs = Buffer.from('historical\n');
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield Buffer.from('live1\nlive2\n');
          yield Buffer.from('live3\n');
        },
      };

      mockContainer.inspect.mockResolvedValue({});
      mockContainer.logs.mockResolvedValueOnce(historicalLogs).mockReturnValueOnce(mockStream as any);

      const logs: string[] = [];
      for await (const line of service.getContainerLogs(containerId)) {
        logs.push(line);
      }

      expect(logs).toContain('historical');
      expect(logs).toContain('live1');
      expect(logs).toContain('live2');
      expect(logs).toContain('live3');
    });

    it('should filter out empty lines', async () => {
      const historicalLogs = Buffer.from('line1\n\nline2\n   \nline3\n');
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          // Empty stream
        },
      };

      mockContainer.inspect.mockResolvedValue({});
      mockContainer.logs.mockResolvedValueOnce(historicalLogs).mockReturnValueOnce(mockStream as any);

      const logs: string[] = [];
      for await (const line of service.getContainerLogs(containerId)) {
        logs.push(line);
      }

      expect(logs).toEqual(['line1', 'line2', 'line3']);
    });

    it('should handle incomplete lines in stream chunks', async () => {
      const historicalLogs = Buffer.from('historical\n');
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield Buffer.from('line1\nline2');
          yield Buffer.from('_continued\nline3\n');
        },
      };

      mockContainer.inspect.mockResolvedValue({});
      mockContainer.logs.mockResolvedValueOnce(historicalLogs).mockReturnValueOnce(mockStream as any);

      const logs: string[] = [];
      for await (const line of service.getContainerLogs(containerId)) {
        logs.push(line);
      }

      expect(logs).toContain('historical');
      expect(logs).toContain('line1');
      expect(logs).toContain('line2_continued');
      expect(logs).toContain('line3');
    });

    it('should handle stream errors gracefully', async () => {
      const historicalLogs = Buffer.from('historical\n');
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield Buffer.from('line1\n');
          const error = new Error('Stream error') as any;
          error.code = 'ECONNRESET';
          throw error;
        },
      };

      mockContainer.inspect.mockResolvedValue({});
      mockContainer.logs.mockResolvedValueOnce(historicalLogs).mockReturnValueOnce(mockStream as any);

      const logs: string[] = [];
      for await (const line of service.getContainerLogs(containerId)) {
        logs.push(line);
      }

      // Should have yielded historical logs and line1 before stream error
      expect(logs).toContain('historical');
      expect(logs).toContain('line1');
    });

    it('should propagate non-connection errors from stream', async () => {
      const historicalLogs = Buffer.from('historical\n');
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield Buffer.from('line1\n');
          throw new Error('Critical error');
        },
      };

      mockContainer.inspect.mockResolvedValue({});
      mockContainer.logs.mockResolvedValueOnce(historicalLogs).mockReturnValueOnce(mockStream as any);

      const logsGenerator = service.getContainerLogs(containerId);
      await expect(async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _ of logsGenerator) {
          // Consume the generator
        }
      }).rejects.toThrow('Critical error');
    });

    it('should handle container inspection errors', async () => {
      const error = new Error('Docker daemon error') as any;
      error.statusCode = 500;
      mockContainer.inspect.mockRejectedValue(error);

      const logsGenerator = service.getContainerLogs(containerId);
      await expect(async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _ of logsGenerator) {
          // Consume the generator to trigger the error
        }
      }).rejects.toThrow('Docker daemon error');
    });

    it('should call getContainer with correct containerId', async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          // Empty stream
        },
      };

      mockContainer.inspect.mockResolvedValue({});
      mockContainer.logs.mockResolvedValueOnce(Buffer.from('')).mockReturnValueOnce(mockStream as any);

      const logsGenerator = service.getContainerLogs(containerId);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of logsGenerator) {
        // Consume the generator
      }

      expect(mockDocker.getContainer).toHaveBeenCalledWith(containerId);
    });
  });

  describe('sendCommandToContainer', () => {
    const containerId = 'test-container-id';

    beforeEach(() => {
      // Reset stream mock for each test
      const dataChunks: Buffer[] = [];
      mockStream.on = jest.fn((event: string, callback: (chunk?: Buffer) => void) => {
        if (event === 'data') {
          // Simulate data collection
          const testData = Buffer.from('test output\n');
          dataChunks.push(testData);
          setTimeout(() => callback(testData), 5);
        } else if (event === 'end' || event === 'close') {
          setTimeout(() => callback(), 10);
        }
        return mockStream;
      });
    });

    it('should throw NotFoundException when container does not exist', async () => {
      mockContainer.inspect.mockRejectedValue({ statusCode: 404 });

      await expect(service.sendCommandToContainer(containerId, 'ls')).rejects.toThrow(NotFoundException);
      expect(mockContainer.inspect).toHaveBeenCalled();
    });

    it('should execute a command without input and return output', async () => {
      mockContainer.inspect.mockResolvedValue({});
      const outputData = Buffer.from([1, 0, 0, 0, 12, 116, 101, 115, 116, 32, 111, 117, 116, 112, 117, 116]); // Docker format: stdout + "test output"
      mockStream.on = jest.fn((event: string, callback: (chunk?: Buffer) => void) => {
        if (event === 'data') {
          setTimeout(() => callback(outputData), 5);
        } else if (event === 'end') {
          setTimeout(() => callback(), 10);
        }
        return mockStream;
      });

      const result = await service.sendCommandToContainer(containerId, 'ls');

      expect(mockContainer.exec).toHaveBeenCalledWith({
        Cmd: ['ls'],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
      });
      expect(mockExec.start).toHaveBeenCalledWith({
        hijack: true,
        stdin: true,
      });
      expect(mockStream.write).not.toHaveBeenCalled();
      expect(mockStream.end).toHaveBeenCalled();
      expect(result).toBeTruthy();
    });

    it('should execute a command with arguments', async () => {
      mockContainer.inspect.mockResolvedValue({});

      await service.sendCommandToContainer(containerId, 'ls -la /tmp');

      expect(mockContainer.exec).toHaveBeenCalledWith({
        Cmd: ['ls', '-la', '/tmp'],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
      });
    });

    it('should send string input as keystrokes', async () => {
      mockContainer.inspect.mockResolvedValue({});

      await service.sendCommandToContainer(containerId, 'bash', 'echo hello');

      expect(mockStream.write).toHaveBeenCalledWith('echo hello\n');
      expect(mockStream.end).toHaveBeenCalled();
    });

    it('should send array of strings as multiple keystrokes', async () => {
      mockContainer.inspect.mockResolvedValue({});

      await service.sendCommandToContainer(containerId, 'bash', ['cd /tmp', 'ls -la']);

      expect(mockStream.write).toHaveBeenCalledWith('cd /tmp\n');
      expect(mockStream.write).toHaveBeenCalledWith('ls -la\n');
      expect(mockStream.write).toHaveBeenCalledTimes(2);
      expect(mockStream.end).toHaveBeenCalled();
    });

    it('should not add newline if input already ends with newline', async () => {
      mockContainer.inspect.mockResolvedValue({});

      await service.sendCommandToContainer(containerId, 'bash', 'echo hello\n');

      expect(mockStream.write).toHaveBeenCalledWith('echo hello\n');
      expect(mockStream.write).toHaveBeenCalledTimes(1);
    });

    it('should handle empty input array', async () => {
      mockContainer.inspect.mockResolvedValue({});

      await service.sendCommandToContainer(containerId, 'bash', []);

      expect(mockStream.write).not.toHaveBeenCalled();
      expect(mockStream.end).toHaveBeenCalled();
    });

    it('should handle container inspection errors', async () => {
      const error = new Error('Docker daemon error') as any;
      error.statusCode = 500;
      mockContainer.inspect.mockRejectedValue(error);

      await expect(service.sendCommandToContainer(containerId, 'ls')).rejects.toThrow('Docker daemon error');
    });

    it('should handle exec creation errors', async () => {
      mockContainer.inspect.mockResolvedValue({});
      mockContainer.exec.mockRejectedValue(new Error('Exec creation failed'));

      await expect(service.sendCommandToContainer(containerId, 'ls')).rejects.toThrow('Exec creation failed');
    });

    it('should handle stream start errors', async () => {
      mockContainer.inspect.mockResolvedValue({});
      mockExec.start.mockRejectedValue(new Error('Stream start failed'));

      await expect(service.sendCommandToContainer(containerId, 'ls')).rejects.toThrow('Stream start failed');
    });

    it('should ignore EPIPE errors when closing stream and return output', async () => {
      mockContainer.inspect.mockResolvedValue({});
      const outputData = Buffer.from([1, 0, 0, 0, 11, 116, 101, 115, 116, 32, 111, 117, 116, 112, 117, 116]); // Docker format
      const handlers: { [key: string]: Array<(arg?: unknown) => void> } = {};

      mockStream.on = jest.fn((event: string, callback: (error?: unknown, chunk?: Buffer) => void) => {
        if (!handlers[event]) {
          handlers[event] = [];
        }
        handlers[event].push(callback as (arg?: unknown) => void);

        // Simulate data event immediately if it's the data handler
        if (event === 'data') {
          setTimeout(() => {
            handlers['data']?.forEach((cb) => cb(outputData));
          }, 5);
        }

        // Simulate error event after data
        if (event === 'error') {
          setTimeout(() => {
            const error = new Error('EPIPE') as any;
            error.code = 'EPIPE';
            handlers['error']?.forEach((cb) => cb(error));
          }, 15);
        }

        // Simulate end event
        if (event === 'end') {
          setTimeout(() => {
            handlers['end']?.forEach((cb) => cb());
          }, 20);
        }

        // Simulate close event
        if (event === 'close') {
          setTimeout(() => {
            handlers['close']?.forEach((cb) => cb());
          }, 25);
        }

        return mockStream;
      });

      const result = await service.sendCommandToContainer(containerId, 'ls');
      expect(result).toBeTruthy();
      expect(result).toContain('test output');
    });

    it('should propagate non-EPIPE stream errors', async () => {
      mockContainer.inspect.mockResolvedValue({});
      const streamError = new Error('Stream error') as any;
      streamError.code = 'ECONNREFUSED';
      mockStream.on = jest.fn((event: string, callback: (error?: unknown) => void) => {
        if (event === 'error') {
          setTimeout(() => callback(streamError), 10);
        }
        return mockStream;
      });

      await expect(service.sendCommandToContainer(containerId, 'ls')).rejects.toThrow('Stream error');
    });

    it('should call getContainer with correct containerId', async () => {
      mockContainer.inspect.mockResolvedValue({});

      await service.sendCommandToContainer(containerId, 'ls');

      expect(mockDocker.getContainer).toHaveBeenCalledWith(containerId);
    });

    it('should handle commands with multiple spaces', async () => {
      mockContainer.inspect.mockResolvedValue({});

      await service.sendCommandToContainer(containerId, 'ls    -la   /tmp');

      expect(mockContainer.exec).toHaveBeenCalledWith({
        Cmd: ['ls', '-la', '/tmp'],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
      });
    });

    it('should handle commands with leading/trailing whitespace', async () => {
      mockContainer.inspect.mockResolvedValue({});

      await service.sendCommandToContainer(containerId, '  ls -la  ');

      expect(mockContainer.exec).toHaveBeenCalledWith({
        Cmd: ['ls', '-la'],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
      });
    });

    it('should handle single-quoted arguments', async () => {
      mockContainer.inspect.mockResolvedValue({});

      await service.sendCommandToContainer(containerId, "git clone 'https://example.com/repo' /app");

      expect(mockContainer.exec).toHaveBeenCalledWith({
        Cmd: ['git', 'clone', 'https://example.com/repo', '/app'],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
      });
    });

    it('should handle double-quoted arguments', async () => {
      mockContainer.inspect.mockResolvedValue({});

      await service.sendCommandToContainer(containerId, 'echo "hello world"');

      expect(mockContainer.exec).toHaveBeenCalledWith({
        Cmd: ['echo', 'hello world'],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
      });
    });

    it('should handle escaped spaces', async () => {
      mockContainer.inspect.mockResolvedValue({});

      await service.sendCommandToContainer(containerId, 'ls -la /tmp\\ with\\ spaces');

      expect(mockContainer.exec).toHaveBeenCalledWith({
        Cmd: ['ls', '-la', '/tmp with spaces'],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
      });
    });

    it('should handle mixed single and double quotes', async () => {
      mockContainer.inspect.mockResolvedValue({});

      await service.sendCommandToContainer(containerId, 'echo \'single\' "double" mixed');

      expect(mockContainer.exec).toHaveBeenCalledWith({
        Cmd: ['echo', 'single', 'double', 'mixed'],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
      });
    });

    it('should handle escaped quotes inside double quotes', async () => {
      mockContainer.inspect.mockResolvedValue({});

      await service.sendCommandToContainer(containerId, 'echo "he said \\"hello\\""');

      expect(mockContainer.exec).toHaveBeenCalledWith({
        Cmd: ['echo', 'he said "hello"'],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
      });
    });

    it('should handle single quotes with spaces inside', async () => {
      mockContainer.inspect.mockResolvedValue({});

      await service.sendCommandToContainer(containerId, "git commit -m 'my commit message with spaces'");

      expect(mockContainer.exec).toHaveBeenCalledWith({
        Cmd: ['git', 'commit', '-m', 'my commit message with spaces'],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
      });
    });

    it('should handle complex command with quotes and escaped characters', async () => {
      mockContainer.inspect.mockResolvedValue({});

      // In single quotes, backslashes are literal, so 'key=value\ with\ spaces' stays as-is
      // For interpreted escapes, use double quotes or no quotes
      await service.sendCommandToContainer(
        containerId,
        'curl -X POST "https://api.example.com" -d "key=value\\ with\\ spaces"',
      );

      expect(mockContainer.exec).toHaveBeenCalledWith({
        Cmd: ['curl', '-X', 'POST', 'https://api.example.com', '-d', 'key=value with spaces'],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
      });
    });

    it('should handle the original issue: git clone with single-quoted URL', async () => {
      mockContainer.inspect.mockResolvedValue({});

      await service.sendCommandToContainer(containerId, "git clone 'https://url' /app");

      expect(mockContainer.exec).toHaveBeenCalledWith({
        Cmd: ['git', 'clone', 'https://url', '/app'],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
      });
    });

    it('should preserve backslashes literally inside single quotes', async () => {
      mockContainer.inspect.mockResolvedValue({});

      // Single quotes preserve everything literally, including backslashes
      await service.sendCommandToContainer(containerId, "echo 'path\\with\\backslashes'");

      expect(mockContainer.exec).toHaveBeenCalledWith({
        Cmd: ['echo', 'path\\with\\backslashes'],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
      });
    });
  });
});
