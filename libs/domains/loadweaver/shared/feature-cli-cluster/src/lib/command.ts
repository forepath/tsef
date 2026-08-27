import type { Command } from 'commander';

import type { LoadweaverContext } from '@forepath/loadweaver/shared/util-cli-core';
import { printStructuredOutput, withExamples } from '@forepath/loadweaver/shared/util-cli-core';

import { ClusterOrchestrator } from './cluster-orchestrator';
import { inspectRemoteDrift } from './mutation-guard';

export function registerClusterCommands(program: Command, getCtx: (command: Command) => LoadweaverContext): void {
  const cluster = program.command('cluster').description('Cluster-wide lifecycle operations');
  withExamples(cluster, [
    'loadweaver --config ./loadweaver.yml cluster status',
    'loadweaver --dry-run cluster init',
    'loadweaver --yes cluster destroy',
  ]);

  const init = cluster
    .command('init')
    .description('Bootstrap the full stack according to configuration')
    .action(async function (this: Command) {
      await new ClusterOrchestrator(getCtx(this)).init();
    });
  withExamples(init, ['loadweaver cluster init', 'loadweaver --dry-run --verbose cluster init']);

  const update = cluster
    .command('update')
    .description('Apply configuration changes to the cluster')
    .action(async function (this: Command) {
      await new ClusterOrchestrator(getCtx(this)).update();
    });
  withExamples(update, ['loadweaver cluster update', 'loadweaver --dry-run cluster update']);

  const destroy = cluster
    .command('destroy')
    .description('Tear down the cluster stack')
    .action(async function (this: Command) {
      const ctx = getCtx(this);

      if (!ctx.options.yes && !ctx.options.dryRun) {
        throw new Error('Refusing to destroy without --yes (or use --dry-run)');
      }

      await new ClusterOrchestrator(ctx).destroy();
    });
  withExamples(destroy, ['loadweaver --dry-run cluster destroy', 'loadweaver --yes cluster destroy']);

  const status = cluster
    .command('status')
    .description('Summarize cluster health')
    .action(async function (this: Command) {
      await new ClusterOrchestrator(getCtx(this)).status();
    });
  withExamples(status, [
    'loadweaver cluster status',
    'loadweaver --json cluster status',
    'loadweaver --config ./loadweaver.yml cluster status',
  ]);

  const drift = cluster
    .command('drift')
    .description('Compare last recorded inventory against the live cluster')
    .action(async function (this: Command) {
      const ctx = getCtx(this);
      const findings = await inspectRemoteDrift(ctx);

      if (findings.length === 0) {
        const payload = { drift: [], message: 'No remote drift detected (or no remote fingerprint baseline yet).' };
        if (ctx.options.json) {
          printStructuredOutput(ctx, payload);
        } else {
          ctx.logger.info(payload.message);
        }
        return;
      }

      printStructuredOutput(ctx, { drift: findings });
    });
  withExamples(drift, ['loadweaver cluster drift', 'loadweaver --verbose cluster drift']);
}
