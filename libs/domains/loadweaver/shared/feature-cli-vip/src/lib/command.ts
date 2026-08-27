import type { Command } from 'commander';

import type { LoadweaverContext } from '@forepath/loadweaver/shared/util-cli-core';
import { runGuardedMutation, withExamples } from '@forepath/loadweaver/shared/util-cli-core';

import { VipService } from './vip.service';

export function registerVipCommands(program: Command, getCtx: (command: Command) => LoadweaverContext): void {
  const vip = program.command('vip').description('Floating IP / keepalived / L4 pool management');
  withExamples(vip, ['loadweaver vip status', 'loadweaver --dry-run vip init']);

  const init = vip
    .command('init')
    .description('Configure keepalived (and HAProxy for VIP pools) on all nodes')
    .action(async function (this: Command) {
      const ctx = getCtx(this);
      await runGuardedMutation(ctx, 'vip.init', () => new VipService(ctx).init());
    });
  withExamples(init, ['loadweaver vip init']);

  const reconcile = vip
    .command('reconcile')
    .description('Re-apply VIP/HAProxy config (refreshes Swarm backend task IPs)')
    .action(async function (this: Command) {
      const ctx = getCtx(this);
      await runGuardedMutation(ctx, 'vip.reconcile', () => new VipService(ctx).reconcile());
    });
  withExamples(reconcile, ['loadweaver vip reconcile', 'loadweaver --dry-run vip reconcile']);

  const status = vip
    .command('status')
    .description('Show VIP ownership and keepalived state for all configured addresses')
    .action(async function (this: Command) {
      await new VipService(getCtx(this)).status();
    });
  withExamples(status, ['loadweaver vip status', 'loadweaver --json vip status']);

  const verifyFailover = vip
    .command('verify-failover')
    .description('Verify a VIP is held by exactly one node; use --simulate --yes to test failover')
    .option('--simulate', 'Stop keepalived on the current holder and verify VIP moves')
    .option('--address <ip>', 'VIP address to verify (defaults to Traefik vip.address)')
    .option('--pool <name>', 'VIP pool name to verify')
    .action(async function (this: Command, options: { simulate?: boolean; address?: string; pool?: string }) {
      await new VipService(getCtx(this)).verifyFailover({
        simulate: Boolean(options.simulate),
        address: options.address,
        pool: options.pool,
      });
    });
  withExamples(verifyFailover, [
    'loadweaver vip verify-failover',
    'loadweaver vip verify-failover --pool postgres',
    'loadweaver --json vip verify-failover',
    'loadweaver --yes vip verify-failover --simulate',
  ]);

  const destroy = vip
    .command('destroy')
    .description('Remove VIP / keepalived / HAProxy configuration')
    .action(async function (this: Command) {
      const ctx = getCtx(this);
      await runGuardedMutation(ctx, 'vip.destroy', () => new VipService(ctx).destroy());
    });
  withExamples(destroy, ['loadweaver --dry-run vip destroy']);
}
