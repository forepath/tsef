import type { LoadweaverContext } from '../context';
import { acquireClusterLock, releaseClusterLock } from './cluster-lock';
import { confirmProceedAfterDrift } from './confirm-drift';

export async function runGuardedMutation(
  ctx: LoadweaverContext,
  operation: string,
  run: () => Promise<void>,
): Promise<void> {
  const lockHeld = !ctx.options.dryRun;
  let hostLockNodeIds: string[] = [];

  if (lockHeld) {
    acquireClusterLock(ctx.options.configPath, operation);
    hostLockNodeIds = ctx.acquireHostLocks ? await ctx.acquireHostLocks(operation) : [];
  }

  try {
    const drifts = ctx.inspectDrift ? await ctx.inspectDrift() : [];

    if (drifts.length > 0) {
      ctx.logger.warn(`Detected ${drifts.length} remote drift finding(s) before ${operation}`);
    }

    const decision = await confirmProceedAfterDrift(drifts, {
      yes: ctx.options.yes,
      acceptDrift: ctx.options.acceptDrift,
      dryRun: ctx.options.dryRun,
      operation,
    });

    if (decision === 'skip') {
      ctx.logger.info(`Refreshing inventory from live cluster before ${operation}`);
      await ctx.refreshInventoryFromLive?.();
    }

    await run();

    if (lockHeld) {
      await ctx.persistInventory?.(operation);
    }
  } finally {
    if (lockHeld) {
      await ctx.releaseHostLocks?.(hostLockNodeIds);
      releaseClusterLock(ctx.options.configPath);
    }
  }
}
