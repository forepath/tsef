import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PassThrough } from 'stream';
import Docker = require('dockerode');

interface TerminalSession {
  exec: Docker.Exec;
  stream: NodeJS.ReadWriteStream;
  containerId: string;
  sessionId: string;
}

@Injectable()
export class DockerService {
  private readonly logger = new Logger(DockerService.name);
  private readonly docker = new Docker({ socketPath: '/var/run/docker.sock' });
  // Store active terminal sessions: sessionId -> TerminalSession
  private readonly terminalSessions = new Map<string, TerminalSession>();

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
   * @returns The command output (stdout and stderr combined)
   * @throws NotFoundException if container is not found
   */
  async sendCommandToContainer(containerId: string, command: string, input?: string | string[]): Promise<string> {
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
        Tty: false, // Disable TTY to properly capture output
      });

      // Start the exec
      const stream = (await exec.start({
        hijack: true,
        stdin: true,
      })) as NodeJS.ReadWriteStream;

      // Collect output from stdout and stderr
      const outputChunks: Buffer[] = [];

      stream.on('data', (chunk: Buffer) => {
        outputChunks.push(chunk);
      });

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

      // Wait for the stream to finish and collect output
      const output = await new Promise<string>((resolve, reject) => {
        let resolved = false;
        const resolveOnce = (result: string) => {
          if (!resolved) {
            resolved = true;
            resolve(result);
          }
        };

        const rejectOnce = (error: unknown) => {
          if (!resolved) {
            resolved = true;
            reject(error);
          }
        };

        stream.on('end', () => {
          // Combine all output chunks and demultiplex Docker's multiplexed format
          const combinedBuffer = Buffer.concat(outputChunks);
          let extractedOutput = '';

          // Docker multiplexed format: [STREAM_TYPE(1 byte)][LENGTH(4 bytes BE)][DATA...]
          // Stream type: 1 = stdout, 2 = stderr
          let i = 0;
          while (i < combinedBuffer.length) {
            if (i + 5 <= combinedBuffer.length) {
              const streamType = combinedBuffer[i];
              const dataLength = combinedBuffer.readUInt32BE(i + 1);
              const dataStart = i + 5;
              const dataEnd = dataStart + dataLength;

              if (dataEnd <= combinedBuffer.length && (streamType === 1 || streamType === 2)) {
                // Valid frame: extract data (both stdout and stderr)
                const data = combinedBuffer.subarray(dataStart, dataEnd);
                extractedOutput += data.toString('utf-8');
                i = dataEnd;
              } else {
                // Invalid frame, try to extract remaining as plain text
                extractedOutput += combinedBuffer.subarray(i).toString('utf-8');
                break;
              }
            } else {
              // Not enough bytes for a complete frame, append as text
              extractedOutput += combinedBuffer.subarray(i).toString('utf-8');
              break;
            }
          }

          resolveOnce(extractedOutput.trim());
        });

        stream.on('close', () => {
          // If we haven't resolved yet, resolve with collected output
          if (!resolved) {
            const combinedBuffer = Buffer.concat(outputChunks);
            resolveOnce(combinedBuffer.toString('utf-8').trim());
          }
        });

        stream.on('error', (error: unknown) => {
          const err = error as { code?: string; message?: string };
          // Ignore EPIPE errors (stdin closed) - this is expected when stdin ends
          if (err.code !== 'EPIPE' && err.code !== 'ECONNRESET') {
            rejectOnce(error);
          } else {
            // For EPIPE/ECONNRESET, resolve with collected output
            const combinedBuffer = Buffer.concat(outputChunks);
            resolveOnce(combinedBuffer.toString('utf-8').trim());
          }
        });

        // Set a timeout to prevent hanging (fallback safety)
        setTimeout(() => {
          if (!resolved) {
            const combinedBuffer = Buffer.concat(outputChunks);
            resolveOnce(combinedBuffer.toString('utf-8').trim());
          }
        }, 30000);
      });

      return output;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const err = error as { message?: string; stack?: string };
      this.logger.error(`Error sending command to container: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Read file content from container using demuxStream for proper stream handling.
   * This method uses Docker's built-in demuxStream to properly separate stdout/stderr,
   * which eliminates null byte artifacts that can occur with manual parsing.
   * @param containerId - The container ID
   * @param filePath - The absolute path to the file in the container
   * @returns The file content as a string
   * @throws NotFoundException if container is not found
   */
  async readFileFromContainer(containerId: string, filePath: string): Promise<string> {
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

      // Escape file path for shell usage
      const escapedPath = filePath.replace(/'/g, "'\\''");
      const safePath = `'${escapedPath}'`;

      // Create exec instance to read file
      const exec = await container.exec({
        Cmd: ['sh', '-c', `cat ${safePath}`],
        AttachStdin: false,
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
      });

      // Start the exec
      const stream = (await exec.start({
        hijack: true,
        stdin: false,
      })) as NodeJS.ReadWriteStream;

      // Use PassThrough streams and demuxStream to properly handle Docker's multiplexed format
      const stdoutStream = new PassThrough();
      const stderrStream = new PassThrough();
      let stdoutData = '';
      let stderrData = '';

      // Collect data from stdout
      stdoutStream.on('data', (chunk: Buffer) => {
        stdoutData += chunk.toString('utf8');
      });

      // Collect data from stderr (for error messages)
      stderrStream.on('data', (chunk: Buffer) => {
        stderrData += chunk.toString('utf8');
      });

      // Use Docker's built-in demuxStream to properly separate stdout and stderr
      container.modem.demuxStream(stream, stdoutStream, stderrStream);

      // Wait for the stream to finish
      const output = await new Promise<string>((resolve, reject) => {
        let resolved = false;
        const resolveOnce = (result: string) => {
          if (!resolved) {
            resolved = true;
            resolve(result);
          }
        };

        const rejectOnce = (error: unknown) => {
          if (!resolved) {
            resolved = true;
            reject(error);
          }
        };

        stream.on('end', () => {
          // End the PassThrough streams
          stdoutStream.end();
          stderrStream.end();

          // If there's stderr output, it might be an error
          if (stderrData.trim()) {
            // Check if it's a file not found error
            if (stderrData.includes('No such file') || stderrData.includes('not found')) {
              rejectOnce(new Error(`File not found: ${filePath}`));
            } else {
              // Log stderr but still return stdout (some commands write to stderr)
              this.logger.debug(`Stderr output from file read: ${stderrData}`);
              resolveOnce(stdoutData);
            }
          } else {
            resolveOnce(stdoutData);
          }
        });

        stream.on('close', () => {
          if (!resolved) {
            stdoutStream.end();
            stderrStream.end();
            resolveOnce(stdoutData);
          }
        });

        stream.on('error', (error: unknown) => {
          const err = error as { code?: string; message?: string };
          // Ignore EPIPE errors (stdin closed) - this is expected
          if (err.code !== 'EPIPE' && err.code !== 'ECONNRESET') {
            rejectOnce(error);
          } else {
            stdoutStream.end();
            stderrStream.end();
            resolveOnce(stdoutData);
          }
        });

        // Set a timeout to prevent hanging (fallback safety)
        setTimeout(() => {
          if (!resolved) {
            stdoutStream.end();
            stderrStream.end();
            resolveOnce(stdoutData);
          }
        }, 30000);
      });

      return output.trim();
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const err = error as { message?: string; stack?: string };
      this.logger.error(`Error reading file from container: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Create a new terminal session (TTY) for a container.
   * Creates a persistent TTY exec instance that can be used for interactive terminal sessions.
   * @param containerId - The ID of the container
   * @param sessionId - Unique session identifier (typically socket.id + timestamp or UUID)
   * @param shell - Shell command to run (default: 'sh')
   * @returns The terminal session stream
   * @throws NotFoundException if container is not found
   */
  async createTerminalSession(containerId: string, sessionId: string, shell = 'sh'): Promise<NodeJS.ReadWriteStream> {
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

      // Check if session already exists
      if (this.terminalSessions.has(sessionId)) {
        this.logger.warn(`Terminal session ${sessionId} already exists, closing existing session`);
        await this.closeTerminalSession(sessionId);
      }

      // Create exec instance with TTY enabled for proper terminal emulation
      const exec = await container.exec({
        Cmd: [shell],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true, // Enable TTY for terminal emulation
      });

      // Start the exec with TTY
      const stream = (await exec.start({
        hijack: true,
        stdin: true,
        Tty: true,
      })) as NodeJS.ReadWriteStream;

      // Store the session
      this.terminalSessions.set(sessionId, {
        exec,
        stream,
        containerId,
        sessionId,
      });

      // Handle stream end/close to clean up session
      stream.on('end', () => {
        this.logger.debug(`Terminal session ${sessionId} ended`);
        this.terminalSessions.delete(sessionId);
      });

      stream.on('close', () => {
        this.logger.debug(`Terminal session ${sessionId} closed`);
        this.terminalSessions.delete(sessionId);
      });

      stream.on('error', (error: unknown) => {
        const err = error as { code?: string; message?: string };
        this.logger.error(`Terminal session ${sessionId} error: ${err.message}`);
        this.terminalSessions.delete(sessionId);
      });

      this.logger.log(`Created terminal session ${sessionId} for container ${containerId}`);
      return stream;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const err = error as { message?: string; stack?: string };
      this.logger.error(`Error creating terminal session: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Send input to a terminal session.
   * @param sessionId - The session identifier
   * @param data - The data to send (string or Buffer)
   * @throws NotFoundException if session is not found
   */
  async sendTerminalInput(sessionId: string, data: string | Buffer): Promise<void> {
    const session = this.terminalSessions.get(sessionId);
    if (!session) {
      throw new NotFoundException(`Terminal session '${sessionId}' not found`);
    }

    try {
      const buffer = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
      session.stream.write(buffer);
    } catch (error: unknown) {
      const err = error as { message?: string; stack?: string };
      this.logger.error(`Error sending input to terminal session ${sessionId}: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Close a terminal session.
   * @param sessionId - The session identifier
   * @throws NotFoundException if session is not found
   */
  async closeTerminalSession(sessionId: string): Promise<void> {
    const session = this.terminalSessions.get(sessionId);
    if (!session) {
      throw new NotFoundException(`Terminal session '${sessionId}' not found`);
    }

    try {
      // End the stream
      session.stream.end();
      // Remove from map (cleanup handlers will also remove it, but do it explicitly)
      this.terminalSessions.delete(sessionId);
      this.logger.log(`Closed terminal session ${sessionId}`);
    } catch (error: unknown) {
      const err = error as { message?: string; stack?: string };
      this.logger.error(`Error closing terminal session ${sessionId}: ${err.message}`, err.stack);
      // Remove from map even if close fails
      this.terminalSessions.delete(sessionId);
      throw error;
    }
  }

  /**
   * Get a terminal session stream.
   * @param sessionId - The session identifier
   * @returns The terminal session stream
   * @throws NotFoundException if session is not found
   */
  getTerminalSession(sessionId: string): NodeJS.ReadWriteStream {
    const session = this.terminalSessions.get(sessionId);
    if (!session) {
      throw new NotFoundException(`Terminal session '${sessionId}' not found`);
    }
    return session.stream;
  }

  /**
   * Check if a terminal session exists.
   * @param sessionId - The session identifier
   * @returns True if session exists, false otherwise
   */
  hasTerminalSession(sessionId: string): boolean {
    return this.terminalSessions.has(sessionId);
  }

  /**
   * Get all active terminal sessions for a container.
   * @param containerId - The container ID
   * @returns Array of session IDs
   */
  getTerminalSessionsForContainer(containerId: string): string[] {
    const sessionIds: string[] = [];
    for (const [sessionId, session] of this.terminalSessions.entries()) {
      if (session.containerId === containerId) {
        sessionIds.push(sessionId);
      }
    }
    return sessionIds;
  }
}
