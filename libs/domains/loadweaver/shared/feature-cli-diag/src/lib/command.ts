import type { Command } from 'commander';

import type { LoadweaverContext } from '@forepath/loadweaver/shared/util-cli-core';
import { withExamples } from '@forepath/loadweaver/shared/util-cli-core';

import { DiagService } from './diag.service';

export function registerDiagCommands(program: Command, getCtx: (command: Command) => LoadweaverContext): void {
  const diag = program.command('diag').description('Diagnostics and health checks');
  withExamples(diag, ['loadweaver diag all', 'loadweaver diag ping', 'loadweaver diag ssh node-a1']);

  const all = diag
    .command('all')
    .description('Run comprehensive cluster diagnostics')
    .action(async function (this: Command) {
      await new DiagService(getCtx(this)).runAll();
    });
  withExamples(all, ['loadweaver diag all', 'loadweaver --verbose diag all']);

  const ping = diag
    .command('ping')
    .description('Ping all nodes over WireGuard')
    .action(async function (this: Command) {
      await new DiagService(getCtx(this)).ping();
    });
  withExamples(ping, ['loadweaver diag ping']);

  const ssh = diag
    .command('ssh')
    .description('Verify SSH target resolution and host software readiness for a node')
    .argument('<nodeId>', 'Node identifier')
    .action(async function (this: Command, nodeId: string) {
      await new DiagService(getCtx(this)).ssh(nodeId);
    });
  withExamples(ssh, ['loadweaver diag ssh node-a1', 'loadweaver --json diag ssh node-a1']);
}
