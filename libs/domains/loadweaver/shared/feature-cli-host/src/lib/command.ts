import type { Command } from 'commander';

import type { LoadweaverContext } from '@forepath/loadweaver/shared/util-cli-core';
import { runGuardedMutation, withExamples } from '@forepath/loadweaver/shared/util-cli-core';

import { HostService } from './host.service';

export function registerHostCommands(program: Command, getCtx: (command: Command) => LoadweaverContext): void {
  const host = program.command('host').description('Host OS provisioning and verification');
  withExamples(host, ['loadweaver host bootstrap', 'loadweaver --dry-run host verify']);

  const bootstrap = host
    .command('bootstrap')
    .description('Install Docker, WireGuard, keepalived, and cephadm on cluster nodes')
    .argument('[nodeId]', 'Optional node id (defaults to all nodes)')
    .action(async function (this: Command, nodeId?: string) {
      const ctx = getCtx(this);
      const operation = nodeId ? `host.bootstrap.${nodeId}` : 'host.bootstrap';
      await runGuardedMutation(ctx, operation, async () => {
        const service = new HostService(ctx);

        if (nodeId) {
          await service.bootstrapNode(nodeId);
        } else {
          await service.bootstrapAll();
        }
      });
    });
  withExamples(bootstrap, ['loadweaver host bootstrap', 'loadweaver host bootstrap node-a1']);

  const verify = host
    .command('verify')
    .description('Verify required host packages are installed on cluster nodes')
    .action(async function (this: Command) {
      await new HostService(getCtx(this)).verifyAll();
    });
  withExamples(verify, ['loadweaver host verify']);

  const status = host
    .command('status')
    .description('Show host software readiness per node')
    .action(async function (this: Command) {
      await new HostService(getCtx(this)).status();
    });
  withExamples(status, ['loadweaver host status']);
}
