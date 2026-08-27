import type { Command } from 'commander';

import type { LoadweaverContext } from '@forepath/loadweaver/shared/util-cli-core';
import { runGuardedMutation, withExamples } from '@forepath/loadweaver/shared/util-cli-core';

import { WireguardService } from './wireguard.service';

export function registerWireguardCommands(program: Command, getCtx: (command: Command) => LoadweaverContext): void {
  const wireguard = program.command('wireguard').description('WireGuard mesh management');
  withExamples(wireguard, ['loadweaver wireguard status', 'loadweaver --dry-run wireguard init']);

  const init = wireguard
    .command('init')
    .description('Generate keys and bring up the WireGuard mesh')
    .action(async function (this: Command) {
      const ctx = getCtx(this);
      await runGuardedMutation(ctx, 'wireguard.init', () => new WireguardService(ctx).init());
    });
  withExamples(init, ['loadweaver wireguard init', 'loadweaver --dry-run wireguard init']);

  const addPeer = wireguard
    .command('add-peer')
    .description('Add a node to the WireGuard mesh')
    .argument('<nodeId>', 'Node identifier')
    .action(async function (this: Command, nodeId: string) {
      const ctx = getCtx(this);
      await runGuardedMutation(ctx, `wireguard.add-peer.${nodeId}`, () => new WireguardService(ctx).addPeer(nodeId));
    });
  withExamples(addPeer, ['loadweaver wireguard add-peer node-b1']);

  const removePeer = wireguard
    .command('remove-peer')
    .description('Remove a node from the WireGuard mesh')
    .argument('<nodeId>', 'Node identifier')
    .action(async function (this: Command, nodeId: string) {
      const ctx = getCtx(this);
      await runGuardedMutation(ctx, `wireguard.remove-peer.${nodeId}`, () =>
        new WireguardService(ctx).removePeer(nodeId),
      );
    });
  withExamples(removePeer, ['loadweaver wireguard remove-peer node-b1']);

  const rotateKeys = wireguard
    .command('rotate-keys')
    .description('Regenerate WireGuard keys and roll out updated peer configs')
    .argument('[nodeId]', 'Optional node id to rotate (defaults to all nodes)')
    .action(async function (this: Command, nodeId?: string) {
      const ctx = getCtx(this);
      const operation = nodeId ? `wireguard.rotate-keys.${nodeId}` : 'wireguard.rotate-keys';
      await runGuardedMutation(ctx, operation, () => new WireguardService(ctx).rotateKeys(nodeId));
    });
  withExamples(rotateKeys, [
    'loadweaver wireguard rotate-keys',
    'loadweaver wireguard rotate-keys node-a1',
    'loadweaver --dry-run wireguard rotate-keys',
  ]);

  const rotationStatus = wireguard
    .command('rotation-status')
    .description('Show WireGuard key age and rotation schedule status')
    .action(async function (this: Command) {
      const exitCode = await new WireguardService(getCtx(this)).rotationStatus();

      if (exitCode !== 0) {
        process.exit(exitCode);
      }
    });
  withExamples(rotationStatus, ['loadweaver wireguard rotation-status', 'loadweaver --json wireguard rotation-status']);

  const rotateIfDue = wireguard
    .command('rotate-if-due')
    .description('Rotate WireGuard keys only when the configured schedule marks them due')
    .action(async function (this: Command) {
      const ctx = getCtx(this);
      await runGuardedMutation(ctx, 'wireguard.rotate-if-due', async () => {
        await new WireguardService(ctx).rotateIfDue();
      });
    });
  withExamples(rotateIfDue, [
    'loadweaver wireguard rotate-if-due',
    'loadweaver --yes wireguard rotate-if-due',
    'loadweaver --dry-run wireguard rotate-if-due',
  ]);

  const rotationSchedule = wireguard
    .command('rotation-schedule')
    .description('Print suggested cron/systemd automation for scheduled key rotation')
    .action(async function (this: Command) {
      new WireguardService(getCtx(this)).rotationScheduleHint();
    });
  withExamples(rotationSchedule, ['loadweaver wireguard rotation-schedule']);

  const status = wireguard
    .command('status')
    .description('Show WireGuard mesh status')
    .action(async function (this: Command) {
      await new WireguardService(getCtx(this)).status();
    });
  withExamples(status, ['loadweaver wireguard status', 'loadweaver --json wireguard status']);
}
