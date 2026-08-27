import type { Command } from 'commander';

import type { LoadweaverContext } from '@forepath/loadweaver/shared/util-cli-core';
import { runGuardedMutation, withExamples } from '@forepath/loadweaver/shared/util-cli-core';

import { NodeService } from './node.service';

export function registerNodeCommands(program: Command, getCtx: (command: Command) => LoadweaverContext): void {
  const node = program.command('node').description('Node lifecycle management');
  withExamples(node, ['loadweaver node join node-b1', 'loadweaver node label node-a1 site=a']);

  const join = node
    .command('join')
    .description('Join a node to the cluster')
    .argument('<nodeId>', 'Node identifier')
    .action(async function (this: Command, nodeId: string) {
      const ctx = getCtx(this);
      await runGuardedMutation(ctx, `node.join.${nodeId}`, () => new NodeService(ctx).join(nodeId));
    });
  withExamples(join, ['loadweaver node join node-b1']);

  const leave = node
    .command('leave')
    .description('Remove a node from the cluster')
    .argument('<nodeId>', 'Node identifier')
    .action(async function (this: Command, nodeId: string) {
      const ctx = getCtx(this);
      await runGuardedMutation(ctx, `node.leave.${nodeId}`, () => new NodeService(ctx).leave(nodeId));
    });
  withExamples(leave, ['loadweaver node leave node-b1']);

  const label = node
    .command('label')
    .description('Manage Swarm node labels')
    .argument('<nodeId>', 'Node identifier')
    .argument('<label>', 'Label key')
    .argument('[value]', 'Label value', 'true')
    .action(async function (this: Command, nodeId: string, labelKey: string, value: string) {
      const ctx = getCtx(this);
      await runGuardedMutation(ctx, `node.label.${nodeId}`, () => new NodeService(ctx).label(nodeId, labelKey, value));
    });
  withExamples(label, ['loadweaver node label node-a1 site=a', 'loadweaver node label node-a1 ceph=true']);
}
