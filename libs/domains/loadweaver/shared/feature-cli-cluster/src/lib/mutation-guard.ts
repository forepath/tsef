import type { DriftFinding, LoadweaverContext } from '@forepath/loadweaver/shared/util-cli-core';

import { detectRemoteDrift } from './drift-detector';
import { loadClusterState } from './cluster-state';
import { collectRemoteFingerprint } from './remote-fingerprint';
import { detectInventoryDrift, readHostInventories } from './node-inventory.service';

export async function inspectRemoteDrift(ctx: LoadweaverContext): Promise<DriftFinding[]> {
  if (!ctx.config) {
    throw new Error('Configuration not loaded');
  }

  const stored = loadClusterState(ctx.options.configPath);

  if (!stored) {
    return [];
  }

  if (ctx.options.dryRun) {
    ctx.logger.warn('Skipping live drift collection in dry-run mode');
    return [];
  }

  const current = await collectRemoteFingerprint(ctx);
  const hostInventories = await readHostInventories(ctx);
  const inventoryNodeIds = Object.keys(ctx.config.nodes);
  const fingerprintDrifts = stored?.remoteFingerprint
    ? detectRemoteDrift(stored.remoteFingerprint, current, ctx.config)
    : [];
  const inventoryDrifts = detectInventoryDrift(stored, hostInventories, current, inventoryNodeIds);

  return [...fingerprintDrifts, ...inventoryDrifts];
}
