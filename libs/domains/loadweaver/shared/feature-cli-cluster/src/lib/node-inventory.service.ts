import * as os from 'node:os';

import type { DriftFinding, LoadweaverContext } from '@forepath/loadweaver/shared/util-cli-core';

import { deriveStateFromConfig, loadClusterState, saveClusterState, type ClusterState } from './cluster-state';
import type { NodeRemoteSnapshot, RemoteFingerprint } from './remote-fingerprint';
import { collectRemoteFingerprint } from './remote-fingerprint';
import { sanitizeDesiredConfig } from './sanitize-desired-config';

export const HOST_LOADWEAVER_DIR = '/etc/loadweaver';
export const HOST_INVENTORY_PATH = `${HOST_LOADWEAVER_DIR}/inventory.json`;
export const HOST_LOCK_PATH = `${HOST_LOADWEAVER_DIR}/lock.json`;

const HOST_LOCK_STALE_MS = 2 * 60 * 60 * 1000;

export interface NodeInventoryRecord {
  inventorySerial: number;
  clusterName: string;
  nodeId: string;
  updatedAt: string;
  lastOperation: string;
  node: {
    hostname: string;
    roles: string[];
    wireguardIp: string;
  };
  fingerprint: NodeRemoteSnapshot;
}

export interface HostLockRecord {
  operation: string;
  startedAt: string;
  operatorHostname: string;
}

function inventoryNodeIds(ctx: LoadweaverContext): string[] {
  const config = ctx.config;

  if (!config) {
    return [];
  }

  if (ctx.options.local) {
    return [config.cluster.primaryManager];
  }

  return Object.keys(config.nodes);
}

function leaveNodeIdFromOperation(operation: string): string | undefined {
  const prefix = 'node.leave.';
  return operation.startsWith(prefix) ? operation.slice(prefix.length) : undefined;
}

function shellJson(value: unknown): string {
  return JSON.stringify(JSON.stringify(value));
}

function parseJson<T>(raw: string): T | undefined {
  const trimmed = raw.trim();

  if (!trimmed) {
    return undefined;
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return undefined;
  }
}

function isHostLockStale(lock: HostLockRecord): boolean {
  const startedAt = Date.parse(lock.startedAt);

  if (Number.isNaN(startedAt)) {
    return true;
  }

  return Date.now() - startedAt > HOST_LOCK_STALE_MS;
}

export function buildNodeInventory(
  state: ClusterState,
  nodeId: string,
  operation: string,
): NodeInventoryRecord | undefined {
  const node = state.desired?.nodes[nodeId];
  const fingerprint = state.remoteFingerprint?.nodes[nodeId];

  if (!node || !fingerprint || state.inventorySerial === undefined) {
    return undefined;
  }

  return {
    inventorySerial: state.inventorySerial,
    clusterName: state.clusterName,
    nodeId,
    updatedAt: state.updatedAt,
    lastOperation: operation,
    node: {
      hostname: node.hostname,
      roles: [...node.roles],
      wireguardIp: node.wireguardIp,
    },
    fingerprint,
  };
}

export async function readHostInventory(
  ctx: LoadweaverContext,
  nodeId: string,
): Promise<NodeInventoryRecord | undefined> {
  const result = await ctx
    .sshForNode(nodeId)
    .execRemote(`cat ${HOST_INVENTORY_PATH} 2>/dev/null || true`, { dryRun: ctx.options.dryRun });

  return parseJson<NodeInventoryRecord>(result.stdout);
}

export async function readHostInventories(ctx: LoadweaverContext): Promise<Record<string, NodeInventoryRecord | null>> {
  const inventories: Record<string, NodeInventoryRecord | null> = {};

  for (const nodeId of inventoryNodeIds(ctx)) {
    try {
      inventories[nodeId] = (await readHostInventory(ctx, nodeId)) ?? null;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.logger.warn(`Unable to read host inventory on ${nodeId}: ${message}`);
      inventories[nodeId] = null;
    }
  }

  return inventories;
}

export async function writeHostInventory(
  ctx: LoadweaverContext,
  nodeId: string,
  inventory: NodeInventoryRecord,
): Promise<void> {
  await ctx
    .sshForNode(nodeId)
    .execRemote(
      `mkdir -p ${HOST_LOADWEAVER_DIR} && printf '%s\\n' ${shellJson(inventory)} > ${HOST_INVENTORY_PATH} && chmod 0640 ${HOST_INVENTORY_PATH}`,
      { dryRun: ctx.options.dryRun },
    );
}

export async function removeHostInventory(ctx: LoadweaverContext, nodeId: string): Promise<void> {
  await ctx
    .sshForNode(nodeId)
    .execRemote(`rm -f ${HOST_INVENTORY_PATH} ${HOST_LOCK_PATH}`, { dryRun: ctx.options.dryRun });
}

export async function removeHostInventories(ctx: LoadweaverContext, nodeIds?: string[]): Promise<void> {
  const targets = nodeIds ?? inventoryNodeIds(ctx);

  for (const nodeId of targets) {
    try {
      await removeHostInventory(ctx, nodeId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.logger.warn(`Unable to remove host inventory on ${nodeId}: ${message}`);
    }
  }
}

export async function persistClusterInventory(ctx: LoadweaverContext, operation: string): Promise<void> {
  if (!ctx.config || ctx.options.dryRun || operation === 'cluster.destroy') {
    return;
  }

  const previous = loadClusterState(ctx.options.configPath);
  const remoteFingerprint = await collectRemoteFingerprint(ctx);
  const state = deriveStateFromConfig(ctx.config, remoteFingerprint, {
    previous,
    bumpSerial: true,
    keepDesired: false,
  });

  saveClusterState(ctx.options.configPath, state);
  await pushHostInventories(ctx, state, operation);
}

export async function refreshInventoryFromLive(ctx: LoadweaverContext): Promise<void> {
  if (!ctx.config || ctx.options.dryRun) {
    return;
  }

  const previous = loadClusterState(ctx.options.configPath);

  if (!previous) {
    return;
  }

  const remoteFingerprint = await collectRemoteFingerprint(ctx);
  const state: ClusterState = {
    ...previous,
    inventorySerial: (previous.inventorySerial ?? 0) + 1,
    updatedAt: new Date().toISOString(),
    desired: previous.desired ?? sanitizeDesiredConfig(ctx.config),
    remoteFingerprint,
  };

  saveClusterState(ctx.options.configPath, state);
  await pushHostInventories(ctx, state, 'inventory.refresh');
}

async function pushHostInventories(ctx: LoadweaverContext, state: ClusterState, operation: string): Promise<void> {
  const skipNodeId = leaveNodeIdFromOperation(operation);

  for (const nodeId of inventoryNodeIds(ctx)) {
    if (nodeId === skipNodeId) {
      continue;
    }

    const inventory = buildNodeInventory(state, nodeId, operation);

    if (!inventory) {
      continue;
    }

    try {
      await writeHostInventory(ctx, nodeId, inventory);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.logger.warn(`Unable to write host inventory on ${nodeId}: ${message}`);
    }
  }
}

export async function acquireHostLocks(ctx: LoadweaverContext, operation: string): Promise<string[]> {
  if (!ctx.config || ctx.options.dryRun) {
    return [];
  }

  const acquired: string[] = [];
  const record: HostLockRecord = {
    operation,
    startedAt: new Date().toISOString(),
    operatorHostname: os.hostname(),
  };

  for (const nodeId of inventoryNodeIds(ctx)) {
    try {
      const existingRaw = await ctx
        .sshForNode(nodeId)
        .execRemote(`cat ${HOST_LOCK_PATH} 2>/dev/null || true`, { dryRun: false });
      const existing = parseJson<HostLockRecord>(existingRaw.stdout);

      if (existing && !isHostLockStale(existing)) {
        throw new Error(
          `Host lock held on ${nodeId} by ${existing.operation} (operator ${existing.operatorHostname}, started ${existing.startedAt})`,
        );
      }

      if (existing) {
        await ctx.sshForNode(nodeId).execRemote(`rm -f ${HOST_LOCK_PATH}`, { dryRun: false });
      }

      const created = await ctx
        .sshForNode(nodeId)
        .execRemote(
          `mkdir -p ${HOST_LOADWEAVER_DIR} && set -C && printf '%s\\n' ${shellJson(record)} > ${HOST_LOCK_PATH}`,
          { dryRun: false },
        );

      if (created.exitCode !== 0) {
        throw new Error(`Failed to acquire host lock on ${nodeId}`);
      }

      acquired.push(nodeId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes('Host lock held')) {
        await releaseHostLocks(ctx, acquired);
        throw error;
      }

      ctx.logger.warn(`Unable to acquire host lock on ${nodeId}: ${message}`);
    }
  }

  return acquired;
}

export async function releaseHostLocks(ctx: LoadweaverContext, nodeIds: string[]): Promise<void> {
  for (const nodeId of nodeIds) {
    try {
      await ctx.sshForNode(nodeId).execRemote(`rm -f ${HOST_LOCK_PATH}`, { dryRun: ctx.options.dryRun });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.logger.warn(`Unable to release host lock on ${nodeId}: ${message}`);
    }
  }
}

export function detectInventoryDrift(
  stored: ClusterState | undefined,
  hostInventories: Record<string, NodeInventoryRecord | null>,
  current: RemoteFingerprint,
  nodeIds: string[],
): DriftFinding[] {
  const drifts: DriftFinding[] = [];
  const localSerial = stored?.inventorySerial;

  for (const nodeId of nodeIds) {
    const host = hostInventories[nodeId];

    if (!host) {
      drifts.push({
        code: `inventory.missing.${nodeId}`,
        message: `Host inventory missing on ${nodeId} (${HOST_INVENTORY_PATH})`,
      });
      continue;
    }

    if (host.nodeId !== nodeId) {
      drifts.push({
        code: `inventory.identity.${nodeId}`,
        message: `Host inventory on ${nodeId} has nodeId ${host.nodeId}`,
      });
    }

    if (stored?.clusterName && host.clusterName !== stored.clusterName) {
      drifts.push({
        code: `inventory.identity.${nodeId}`,
        message: `Host inventory on ${nodeId} is for cluster ${host.clusterName}, expected ${stored.clusterName}`,
      });
    }

    if (localSerial !== undefined && host.inventorySerial !== localSerial) {
      drifts.push({
        code: `inventory.serial.${nodeId}`,
        message: `Host inventory serial on ${nodeId} is ${host.inventorySerial}, local inventory serial is ${localSerial}`,
      });
    }

    const live = current.nodes[nodeId];

    if (!live) {
      continue;
    }

    if (host.fingerprint.wireguardActive !== live.wireguardActive) {
      drifts.push({
        code: `inventory.live.${nodeId}.wireguard`,
        message: `WireGuard on ${nodeId} does not match host inventory (inventory=${host.fingerprint.wireguardActive}, live=${live.wireguardActive})`,
      });
    }

    if (host.fingerprint.wireguardPeerCount !== live.wireguardPeerCount) {
      drifts.push({
        code: `inventory.live.${nodeId}.wireguard-peers`,
        message: `WireGuard peer count on ${nodeId} does not match host inventory (${host.fingerprint.wireguardPeerCount} -> ${live.wireguardPeerCount})`,
      });
    }

    if (host.fingerprint.swarmActive !== live.swarmActive) {
      drifts.push({
        code: `inventory.live.${nodeId}.swarm`,
        message: `Swarm on ${nodeId} does not match host inventory (inventory=${host.fingerprint.swarmActive}, live=${live.swarmActive})`,
      });
    }

    if (host.fingerprint.cephMounted !== live.cephMounted) {
      drifts.push({
        code: `inventory.live.${nodeId}.cephfs`,
        message: `CephFS on ${nodeId} does not match host inventory (inventory=${host.fingerprint.cephMounted}, live=${live.cephMounted})`,
      });
    }
  }

  return drifts;
}
