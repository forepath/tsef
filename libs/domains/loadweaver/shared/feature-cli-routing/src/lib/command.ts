import type { Command } from 'commander';

import type { LoadweaverContext } from '@forepath/loadweaver/shared/util-cli-core';
import { runGuardedMutation, withExamples } from '@forepath/loadweaver/shared/util-cli-core';

import { RoutingService } from './routing.service';

export function registerRoutingCommands(program: Command, getCtx: (command: Command) => LoadweaverContext): void {
  const routing = program.command('routing').description('BIRD routing management');
  withExamples(routing, ['loadweaver routing status', 'loadweaver --dry-run routing init']);

  const init = routing
    .command('init')
    .description('Configure BIRD on routing hub nodes')
    .action(async function (this: Command) {
      const ctx = getCtx(this);
      await runGuardedMutation(ctx, 'routing.init', () => new RoutingService(ctx).init());
    });
  withExamples(init, ['loadweaver routing init']);

  const reconcile = routing
    .command('reconcile')
    .description('Reconcile BIRD configuration on routing hub nodes')
    .action(async function (this: Command) {
      const ctx = getCtx(this);
      await runGuardedMutation(ctx, 'routing.reconcile', () => new RoutingService(ctx).reconcile());
    });
  withExamples(reconcile, ['loadweaver routing reconcile']);

  const status = routing
    .command('status')
    .description('Show BIRD protocol and route state on hub nodes')
    .action(async function (this: Command) {
      await new RoutingService(getCtx(this)).status();
    });
  withExamples(status, ['loadweaver routing status', 'loadweaver --json routing status']);

  const destroy = routing
    .command('destroy')
    .description('Stop BIRD and tear down cross-cluster WireGuard links on hubs')
    .action(async function (this: Command) {
      const ctx = getCtx(this);
      await runGuardedMutation(ctx, 'routing.destroy', () => new RoutingService(ctx).destroy());
    });
  withExamples(destroy, ['loadweaver --dry-run routing destroy']);
}
