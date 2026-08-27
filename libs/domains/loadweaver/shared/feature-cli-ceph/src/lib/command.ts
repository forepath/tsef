import type { Command } from 'commander';

import type { LoadweaverContext } from '@forepath/loadweaver/shared/util-cli-core';
import { runGuardedMutation, withExamples } from '@forepath/loadweaver/shared/util-cli-core';

import { CephService } from './ceph.service';

export function registerCephCommands(program: Command, getCtx: (command: Command) => LoadweaverContext): void {
  const ceph = program.command('ceph').description('Ceph cluster and CephFS management');
  withExamples(ceph, ['loadweaver ceph status', 'loadweaver --dry-run ceph init']);

  const init = ceph
    .command('init')
    .description('Bootstrap Ceph MON/MGR via cephadm')
    .action(async function (this: Command) {
      const ctx = getCtx(this);
      await runGuardedMutation(ctx, 'ceph.init', () => new CephService(ctx).init());
    });
  withExamples(init, ['loadweaver ceph init']);

  const cephfsCreate = ceph
    .command('cephfs-create')
    .description('Create CephFS filesystem')
    .action(async function (this: Command) {
      const ctx = getCtx(this);
      await runGuardedMutation(ctx, 'ceph.cephfs-create', () => new CephService(ctx).createCephfs());
    });
  withExamples(cephfsCreate, ['loadweaver ceph cephfs-create']);

  const cephfsMount = ceph
    .command('cephfs-mount')
    .description('Mount CephFS on all nodes')
    .action(async function (this: Command) {
      const ctx = getCtx(this);
      await runGuardedMutation(ctx, 'ceph.cephfs-mount', () => new CephService(ctx).mountCephfsAll());
    });
  withExamples(cephfsMount, ['loadweaver ceph cephfs-mount']);

  const osdAdd = ceph
    .command('osd-add')
    .description('Add an OSD on a node')
    .argument('<nodeId>', 'Node identifier')
    .argument('[device]', 'Block device path (defaults to nodes.<id>.osdDevice)')
    .action(async function (this: Command, nodeId: string, device?: string) {
      const ctx = getCtx(this);
      await runGuardedMutation(ctx, `ceph.osd-add.${nodeId}`, () =>
        device ? new CephService(ctx).addOsd(nodeId, device) : new CephService(ctx).addOsdForNode(nodeId),
      );
    });
  withExamples(osdAdd, ['loadweaver ceph osd-add node-a1 /dev/sdb', 'loadweaver ceph osd-add node-a2']);

  const osdReconcile = ceph
    .command('osd-reconcile')
    .description('Add OSDs for all nodes with ceph-osd role and osdDevice configured')
    .action(async function (this: Command) {
      const ctx = getCtx(this);
      await runGuardedMutation(ctx, 'ceph.osd-reconcile', () => new CephService(ctx).reconcileOsds());
    });
  withExamples(osdReconcile, ['loadweaver ceph osd-reconcile']);

  const osdRemove = ceph
    .command('osd-remove')
    .description('Remove an OSD')
    .argument('<osdId>', 'OSD identifier')
    .action(async function (this: Command, osdId: string) {
      const ctx = getCtx(this);
      await runGuardedMutation(ctx, `ceph.osd-remove.${osdId}`, () => new CephService(ctx).removeOsd(osdId));
    });
  withExamples(osdRemove, ['loadweaver ceph osd-remove osd.0']);

  const status = ceph
    .command('status')
    .description('Show Ceph cluster health')
    .action(async function (this: Command) {
      await new CephService(getCtx(this)).status();
    });
  withExamples(status, ['loadweaver ceph status']);
}
