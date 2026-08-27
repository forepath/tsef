import type { Command } from 'commander';

import type { LoadweaverContext } from '@forepath/loadweaver/shared/util-cli-core';
import { runGuardedMutation, withExamples } from '@forepath/loadweaver/shared/util-cli-core';

import { VolumeService } from './volume.service';

export function registerVolumeCommands(program: Command, getCtx: (command: Command) => LoadweaverContext): void {
  const volume = program.command('volume').description('CephFS-backed Docker volume management');
  withExamples(volume, ['loadweaver volume list', 'loadweaver --dry-run volume create']);

  const create = volume
    .command('create')
    .description('Create Docker volumes bound to CephFS paths on all nodes')
    .action(async function (this: Command) {
      const ctx = getCtx(this);
      await runGuardedMutation(ctx, 'volume.create', () => new VolumeService(ctx).createAll());
    });
  withExamples(create, ['loadweaver volume create']);

  const list = volume
    .command('list')
    .description('List Docker volumes on the primary manager')
    .action(async function (this: Command) {
      await new VolumeService(getCtx(this)).list();
    });
  withExamples(list, ['loadweaver volume list']);
}
