import type { LoadweaverContext } from '@forepath/loadweaver/shared/util-cli-core';
import { printStructuredOutput } from '@forepath/loadweaver/shared/util-cli-core';

import { joinRemoteCommand } from './join-remote-command.service';

export class SshService {
  constructor(private readonly ctx: LoadweaverContext) {}

  async exec(nodeId: string, commandParts: string[]): Promise<number> {
    const config = this.requireConfig();

    if (!config.nodes[nodeId]) {
      throw new Error(`Unknown node: ${nodeId}`);
    }

    if (commandParts.length === 0) {
      throw new Error('Remote command required. Example: loadweaver ssh node-a1 -- docker ps');
    }

    const command = joinRemoteCommand(commandParts);
    const result = await this.ctx.sshForNode(nodeId).execRemote(command, { dryRun: this.ctx.options.dryRun });

    if (this.ctx.options.json) {
      printStructuredOutput(this.ctx, {
        nodeId,
        command,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        dryRun: result.dryRun,
      });
    } else {
      if (result.stdout) {
        process.stdout.write(result.stdout.endsWith('\n') ? result.stdout : `${result.stdout}\n`);
      }

      if (result.stderr) {
        process.stderr.write(result.stderr.endsWith('\n') ? result.stderr : `${result.stderr}\n`);
      }
    }

    return result.exitCode;
  }

  private requireConfig() {
    if (!this.ctx.config) {
      throw new Error('Configuration not loaded');
    }

    return this.ctx.config;
  }
}
