import { ndJsonStream, type Stream } from '@agentclientprotocol/sdk';
import { Injectable, Logger } from '@nestjs/common';

import { DockerService } from '../../services/docker.service';

import type { AcpTransport } from './acp-transport.interface';

@Injectable()
export class DockerAcpTransport implements AcpTransport {
  private readonly logger = new Logger(DockerAcpTransport.name);
  readonly stream: Stream;
  private readonly closeSession: () => Promise<void>;

  private constructor(stream: Stream, closeSession: () => Promise<void>) {
    this.stream = stream;
    this.closeSession = closeSession;
  }

  static async connect(
    dockerService: DockerService,
    containerId: string,
    executable: string,
    args: string[],
  ): Promise<DockerAcpTransport> {
    const command = [executable, ...args].join(' ');
    const session = await dockerService.createExecSession(containerId, command);
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const output = new WritableStream<Uint8Array>({
      write(chunk) {
        session.writeLine(decoder.decode(chunk));
      },
    });
    const input = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const line of session.stdoutLines()) {
            controller.enqueue(encoder.encode(`${line}\n`));
          }

          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });
    const stream = ndJsonStream(output, input);

    return new DockerAcpTransport(stream, async () => {
      await session.close();
    });
  }

  async close(): Promise<void> {
    try {
      await this.closeSession();
    } catch (error) {
      const err = error as { message?: string; stack?: string };

      this.logger.warn(`Failed to close ACP transport cleanly: ${err.message}`, err.stack);
    }
  }
}

@Injectable()
export class DockerAcpTransportFactory {
  constructor(private readonly dockerService: DockerService) {}

  async connect(containerId: string, launchSpec: { executable: string; args: string[] }): Promise<AcpTransport> {
    return DockerAcpTransport.connect(this.dockerService, containerId, launchSpec.executable, launchSpec.args);
  }
}
