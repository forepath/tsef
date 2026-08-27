import type { Command } from 'commander';

import type { LoadweaverContext } from '@forepath/loadweaver/shared/util-cli-core';
import { withExamples } from '@forepath/loadweaver/shared/util-cli-core';

import { SshService } from './ssh.service';

function normalizeCommandParts(parts: string[]): string[] {
  return parts[0] === '--' ? parts.slice(1) : parts;
}

export function registerSshCommands(program: Command, getCtx: (command: Command) => LoadweaverContext): void {
  const ssh = program
    .command('ssh')
    .description('Run a command on a cluster node via SSH')
    .argument('<nodeId>', 'Node identifier')
    .argument('[command...]', 'Remote command and arguments')
    .action(async function (this: Command, nodeId: string, commandParts: string[]) {
      const exitCode = await new SshService(getCtx(this)).exec(nodeId, normalizeCommandParts(commandParts));

      if (exitCode !== 0) {
        process.exit(exitCode);
      }
    });

  withExamples(ssh, [
    'loadweaver ssh node-a1 -- docker ps',
    'loadweaver ssh node-a1 -- ls -la /mnt/cephfs',
    'loadweaver --dry-run ssh node-a1 -- docker ps',
    'loadweaver --json ssh node-a1 -- docker ps',
  ]);
}
