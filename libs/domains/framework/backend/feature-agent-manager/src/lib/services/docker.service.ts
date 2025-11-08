import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import Docker = require('dockerode');

@Injectable()
export class DockerService {
  private readonly logger = new Logger(DockerService.name);
  private readonly docker = new Docker({ socketPath: '/var/run/docker.sock' });

  async createContainer(options: {
    image?: string;
    name?: string;
    env?: Record<string, string | undefined>;
    volumes?: Array<{ hostPath: string; containerPath: string; readOnly?: boolean }>;
    ports?: Array<{ containerPort: number; hostPort?: number; protocol?: 'tcp' | 'udp' }>;
  }): Promise<string> {
    const { image, name, env, volumes = [], ports = [] } = options;

    // Resolve image: explicit -> env -> default placeholder
    const resolvedImage =
      image || process.env.AGENT_DEFAULT_IMAGE || 'ghcr.io/forepath/tsef-agent-manager-worker:latest';

    // Build HostConfig.Binds from volumes
    const binds = volumes.map((v) => `${v.hostPath}:${v.containerPath}${v.readOnly ? ':ro' : ''}`);

    // Build ExposedPorts and PortBindings from ports
    const exposedPorts: Record<string, Record<string, never>> = {};
    const portBindings: Record<string, Array<{ HostPort?: string }>> = {};
    for (const p of ports) {
      const key = `${p.containerPort}/${p.protocol ?? 'tcp'}`;
      exposedPorts[key] = {};
      if (!portBindings[key]) portBindings[key] = [];
      portBindings[key].push({ HostPort: p.hostPort ? String(p.hostPort) : undefined });
    }

    // Ensure image is available (pull if necessary)
    await new Promise<void>((resolve, reject) => {
      this.docker.pull(resolvedImage, (err: unknown, stream: NodeJS.ReadableStream) => {
        if (err) return reject(err);
        // followProgress is available via modem (not typed in dockerode)
        const modem: any = (this.docker as any).modem;
        modem.followProgress(stream, (pullErr: unknown) => (pullErr ? reject(pullErr) : resolve()));
      });
    }).catch((e) => {
      // If pull fails, log and proceed - create might still work if image exists locally
      this.logger.warn(`Failed to pull image ${resolvedImage}: ${(e as Error).message}`);
    });

    // Map env object to KEY=VALUE strings as required by Docker API
    // Escape special characters in the value to preserve intent (no quoting)
    const escapeEnvValue = (val: string): string =>
      val.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');

    const maybeQuote = (val: string): string => {
      // Quote if contains whitespace or quotes
      if (/\s|"|'/u.test(val)) {
        const inner = val.replace(/"/g, '\\"');
        return `"${inner}"`;
      }
      return val;
    };

    const envArray = env
      ? Object.entries(env).map(([key, value]) => {
          const raw = value == null ? '' : escapeEnvValue(String(value));
          const quoted = maybeQuote(raw);
          return `${key}=${quoted}`;
        })
      : undefined;

    // Create container
    const container = await this.docker.createContainer({
      Image: resolvedImage,
      name,
      Env: envArray,
      ExposedPorts: Object.keys(exposedPorts).length ? exposedPorts : undefined,
      HostConfig: {
        Binds: binds.length ? binds : undefined,
        PortBindings: Object.keys(portBindings).length ? portBindings : undefined,
        AutoRemove: false,
      },
    });

    // Start container
    await container.start();

    return container.id as unknown as string;
  }

  /**
   * Delete a Docker container by ID.
   * Stops the container if it's running, then removes it.
   * @param containerId - The ID of the container to delete
   * @throws NotFoundException if container is not found
   */
  async deleteContainer(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);

      // Check if container exists and get its state
      let containerInfo;
      try {
        containerInfo = await container.inspect();
      } catch (error: unknown) {
        const dockerError = error as { statusCode?: number };
        if (dockerError.statusCode === 404) {
          throw new NotFoundException(`Container with ID '${containerId}' not found`);
        }
        throw error;
      }

      // Stop the container if it's running
      if (containerInfo.State?.Running) {
        try {
          await container.stop();
        } catch (error: unknown) {
          const stopError = error as { statusCode?: number; message?: string };
          // Ignore error if container is already stopped (409 Conflict)
          if (stopError.statusCode !== 409) {
            this.logger.warn(`Failed to stop container ${containerId}: ${stopError.message}`, stopError);
            // Continue with removal attempt even if stop failed
          }
        }
      }

      // Remove the container
      try {
        await container.remove();
      } catch (error: unknown) {
        const removeError = error as { statusCode?: number; message?: string };
        // If container doesn't exist (404), consider it already deleted
        if (removeError.statusCode === 404) {
          this.logger.debug(`Container ${containerId} was already removed`);
          return;
        }
        // If container is still running (409), try force removal
        if (removeError.statusCode === 409) {
          this.logger.warn(`Container ${containerId} is still running, attempting force removal`);
          try {
            await container.remove({ force: true });
          } catch (forceError: unknown) {
            const forceErr = forceError as { message?: string; stack?: string };
            this.logger.error(`Failed to force remove container ${containerId}: ${forceErr.message}`, forceErr.stack);
            throw forceError;
          }
        } else {
          const err = removeError as { message?: string; stack?: string };
          this.logger.error(`Failed to remove container ${containerId}: ${err.message}`, err.stack);
          throw error;
        }
      }
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const err = error as { message?: string; stack?: string };
      this.logger.error(`Error deleting container: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Get container logs as a stream of lines.
   * First returns historical logs, then tails live logs.
   * @param containerId - The ID of the container
   * @returns An async iterable that yields log lines
   * @throws NotFoundException if container is not found
   */
  async *getContainerLogs(containerId: string): AsyncIterable<string> {
    try {
      const container = this.docker.getContainer(containerId);

      // Check if container exists
      try {
        await container.inspect();
      } catch (error: unknown) {
        const dockerError = error as { statusCode?: number };
        if (dockerError.statusCode === 404) {
          throw new NotFoundException(`Container with ID '${containerId}' not found`);
        }
        throw error;
      }

      // First, get historical logs
      const historicalLogs = await container.logs({
        stdout: true,
        stderr: true,
        tail: 100, // Get last 100 lines of historical logs
        timestamps: false,
      });

      // Parse historical logs and yield each line
      const historicalBuffer = Buffer.isBuffer(historicalLogs) ? historicalLogs : Buffer.from(historicalLogs);
      const historicalLines = historicalBuffer.toString('utf-8').split('\n');
      for (const line of historicalLines) {
        if (line.trim()) {
          yield line;
        }
      }

      // Then, tail live logs
      // When follow: true, dockerode returns a stream directly (not a promise)
      const logStream = (await container.logs({
        stdout: true,
        stderr: true,
        follow: true,
        tail: 0, // Start from now (no historical logs, we already got them)
        timestamps: false,
      })) as NodeJS.ReadableStream;

      // Process live log stream
      let buffer = '';
      try {
        for await (const chunk of logStream) {
          buffer += chunk.toString('utf-8');
          const lines = buffer.split('\n');
          // Keep the last incomplete line in buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim()) {
              yield line;
            }
          }
        }

        // Yield any remaining buffer content
        if (buffer.trim()) {
          yield buffer;
        }
      } catch (streamError: unknown) {
        // Stream ended or error occurred
        const err = streamError as { code?: string; message?: string; stack?: string };
        if (err.code !== 'ECONNRESET' && err.code !== 'EPIPE') {
          this.logger.error(`Error reading log stream: ${err.message}`, err.stack);
          throw streamError;
        }
      }
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const err = error as { message?: string; stack?: string };
      this.logger.error(`Error getting container logs: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Parse a shell command string into an array of arguments.
   * Handles single quotes, double quotes, escaped characters, and spaces.
   * @param command - The command string to parse
   * @returns Array of parsed arguments
   * @example
   * parseShellCommand("git clone 'https://url' /app") // ['git', 'clone', 'https://url', '/app']
   * parseShellCommand('echo "hello world"') // ['echo', 'hello world']
   * parseShellCommand('ls -la /tmp\\ with\\ spaces') // ['ls', '-la', '/tmp with spaces']
   */
  private parseShellCommand(command: string): string[] {
    const args: string[] = [];
    let current = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let i = 0;

    while (i < command.length) {
      const char = command[i];
      const nextChar = i + 1 < command.length ? command[i + 1] : null;

      if (inSingleQuote) {
        // Inside single quotes: everything is literal except the closing quote
        if (char === "'") {
          inSingleQuote = false;
        } else {
          current += char;
        }
      } else if (inDoubleQuote) {
        // Inside double quotes: backslash escapes next character
        if (char === '\\' && nextChar !== null) {
          current += nextChar;
          i++; // Skip next character as it's escaped
        } else if (char === '"') {
          inDoubleQuote = false;
        } else {
          current += char;
        }
      } else {
        // Not in quotes
        if (char === '\\' && nextChar !== null) {
          // Escaped character
          current += nextChar;
          i++; // Skip next character as it's escaped
        } else if (char === "'") {
          inSingleQuote = true;
        } else if (char === '"') {
          inDoubleQuote = true;
        } else if (/\s/.test(char)) {
          // Whitespace: end current argument
          if (current.length > 0) {
            args.push(current);
            current = '';
          }
          // Skip additional whitespace
          while (i + 1 < command.length && /\s/.test(command[i + 1])) {
            i++;
          }
        } else {
          current += char;
        }
      }
      i++;
    }

    // Add final argument if any
    if (current.length > 0) {
      args.push(current);
    }

    return args;
  }

  /**
   * Send a command or keystrokes to a container.
   * Executes a command in the container and optionally sends input/keystrokes to stdin.
   * @param containerId - The ID of the container
   * @param command - The command to execute (e.g., 'bash', 'sh', or a specific command)
   * @param input - Optional input/keystrokes to send to stdin (string or array of strings)
   * @throws NotFoundException if container is not found
   */
  async sendCommandToContainer(containerId: string, command: string, input?: string | string[]): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);

      // Check if container exists
      try {
        await container.inspect();
      } catch (error: unknown) {
        const dockerError = error as { statusCode?: number };
        if (dockerError.statusCode === 404) {
          throw new NotFoundException(`Container with ID '${containerId}' not found`);
        }
        throw error;
      }

      // Parse command into executable and arguments
      // Handles quoted arguments (single/double quotes) and escaped spaces
      const commandParts = this.parseShellCommand(command.trim());
      const executable = commandParts[0];
      const args = commandParts.slice(1);

      // Create exec instance with stdin enabled for keystrokes
      const exec = await container.exec({
        Cmd: [executable, ...args],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true, // Enable TTY for interactive keystrokes
      });

      // Start the exec
      const stream = (await exec.start({
        hijack: true,
        stdin: true,
      })) as NodeJS.ReadWriteStream;

      // Send input/keystrokes if provided
      if (input !== undefined) {
        const inputArray = Array.isArray(input) ? input : [input];
        for (const inputLine of inputArray) {
          // Add newline if not present (simulates Enter key)
          const lineToSend = inputLine.endsWith('\n') ? inputLine : `${inputLine}\n`;
          stream.write(lineToSend);
        }
      }

      // Close stdin to signal end of input
      stream.end();

      // Wait for the stream to finish
      await new Promise<void>((resolve, reject) => {
        let resolved = false;
        const resolveOnce = () => {
          if (!resolved) {
            resolved = true;
            resolve();
          }
        };

        stream.on('end', resolveOnce);
        stream.on('close', resolveOnce);
        stream.on('error', (error: unknown) => {
          const err = error as { code?: string; message?: string };
          // Ignore EPIPE errors (stdin closed) - this is expected when stdin ends
          if (err.code !== 'EPIPE' && err.code !== 'ECONNRESET') {
            if (!resolved) {
              resolved = true;
              reject(error);
            }
          } else {
            resolveOnce();
          }
        });
        // Set a timeout to prevent hanging (fallback safety)
        setTimeout(() => resolveOnce(), 30000);
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const err = error as { message?: string; stack?: string };
      this.logger.error(`Error sending command to container: ${err.message}`, err.stack);
      throw error;
    }
  }
}
