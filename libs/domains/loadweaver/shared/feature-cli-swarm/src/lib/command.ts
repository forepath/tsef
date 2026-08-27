import type { Command } from 'commander';

import type { LoadweaverContext } from '@forepath/loadweaver/shared/util-cli-core';
import { runGuardedMutation, withExamples } from '@forepath/loadweaver/shared/util-cli-core';

import { SwarmService } from './swarm.service';

export function registerSwarmCommands(program: Command, getCtx: (command: Command) => LoadweaverContext): void {
  const swarm = program.command('swarm').description('Docker Swarm management');
  withExamples(swarm, ['loadweaver swarm status', 'loadweaver --dry-run swarm init']);

  const init = swarm
    .command('init')
    .description('Initialize Swarm on the primary manager')
    .action(async function (this: Command) {
      const ctx = getCtx(this);
      await runGuardedMutation(ctx, 'swarm.init', () => new SwarmService(ctx).init());
    });
  withExamples(init, ['loadweaver swarm init']);

  const join = swarm
    .command('join')
    .description('Join all configured nodes to Swarm')
    .action(async function (this: Command) {
      const ctx = getCtx(this);
      await runGuardedMutation(ctx, 'swarm.join', () => new SwarmService(ctx).joinAll());
    });
  withExamples(join, ['loadweaver swarm join']);

  const reconcileLabels = swarm
    .command('reconcile-labels')
    .description('Add expected loadweaver Swarm labels and remove stale managed labels')
    .argument('[nodeId]', 'Optional node id (defaults to all configured nodes)')
    .action(async function (this: Command, nodeId?: string) {
      const ctx = getCtx(this);
      const operation = nodeId ? `swarm.reconcile-labels.${nodeId}` : 'swarm.reconcile-labels';
      await runGuardedMutation(ctx, operation, async () => {
        const service = new SwarmService(ctx);
        await service.reconcileLabels(nodeId ? [nodeId] : undefined);
      });
    });
  withExamples(reconcileLabels, [
    'loadweaver swarm reconcile-labels',
    'loadweaver swarm reconcile-labels node-a2',
    'loadweaver --dry-run swarm reconcile-labels',
  ]);

  const network = swarm.command('network').description('Swarm overlay network management');
  withExamples(network, ['loadweaver swarm network create']);

  const create = network
    .command('create')
    .description('Create configured overlay networks')
    .action(async function (this: Command) {
      const ctx = getCtx(this);
      await runGuardedMutation(ctx, 'swarm.network.create', () => new SwarmService(ctx).createNetworks());
    });
  withExamples(create, ['loadweaver swarm network create']);

  const status = swarm
    .command('status')
    .description('Show Swarm nodes and networks')
    .action(async function (this: Command) {
      await new SwarmService(getCtx(this)).status();
    });
  withExamples(status, ['loadweaver swarm status']);
}
