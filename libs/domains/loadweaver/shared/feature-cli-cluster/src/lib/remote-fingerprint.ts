import type { LoadweaverContext } from '@forepath/loadweaver/shared/util-cli-core';
import { listVipAddresses } from '@forepath/loadweaver/shared/util-cli-core';

export interface NodeRemoteSnapshot {
  wireguardActive: boolean;
  wireguardPeerCount: number;
  swarmActive: boolean;
  cephMounted: boolean;
}

export interface RemoteFingerprint {
  capturedAt: string;
  swarmNodeHostnames: string[];
  swarmNodeLabels: Record<string, string[]>;
  traefikImage: string | null;
  traefikDeployed: boolean;
  traefikServiceVersion: string | null;
  traefikReplicas: string | null;
  vipKeepalivedActive: boolean;
  vipHolderNodeId: string | null;
  vipHolders: Record<string, string | null>;
  cephHealth: string | null;
  cephMonitorCount: number;
  nodes: Record<string, NodeRemoteSnapshot>;
}

export async function collectRemoteFingerprint(ctx: LoadweaverContext): Promise<RemoteFingerprint> {
  if (!ctx.config) {
    throw new Error('Configuration not loaded');
  }

  const config = ctx.config;
  const primary = config.cluster.primaryManager;
  const nodes: Record<string, NodeRemoteSnapshot> = {};

  for (const nodeId of Object.keys(config.nodes)) {
    nodes[nodeId] = await probeNode(ctx, nodeId);
  }

  const swarmNodeHostnames = await probeSwarmNodeHostnames(ctx, primary);
  const swarmNodeLabels = await probeSwarmNodeLabels(ctx, primary);
  const traefik = await probeTraefik(ctx, primary);
  const vipKeepalivedActive = config.vip ? await probeKeepalived(ctx, primary) : false;
  const vipHolders = config.vip ? await probeVipHolders(ctx) : {};
  const vipHolderNodeId = config.vip?.address ? (vipHolders[config.vip.address] ?? null) : null;
  const ceph = await probeCeph(ctx, primary);

  return {
    capturedAt: new Date().toISOString(),
    swarmNodeHostnames,
    swarmNodeLabels,
    traefikImage: traefik.image,
    traefikDeployed: traefik.deployed,
    traefikServiceVersion: traefik.serviceVersion,
    traefikReplicas: traefik.replicas,
    vipKeepalivedActive,
    vipHolderNodeId,
    vipHolders,
    cephHealth: ceph.health,
    cephMonitorCount: ceph.monitorCount,
    nodes,
  };
}

async function probeNode(ctx: LoadweaverContext, nodeId: string): Promise<NodeRemoteSnapshot> {
  const config = ctx.config!;
  const iface = config.wireguard.interface;
  const mountPath = config.ceph.mountPath;

  const wireguard = await ctx
    .sshForNode(nodeId)
    .execRemote(`wg show ${iface} >/dev/null 2>&1 && echo active || echo inactive`, { dryRun: ctx.options.dryRun });
  const peerCount = await ctx
    .sshForNode(nodeId)
    .execRemote(`wg show ${iface} peers 2>/dev/null | wc -l | tr -d ' '`, { dryRun: ctx.options.dryRun });
  const swarm = await ctx
    .sshForNode(nodeId)
    .execRemote(`docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null || echo inactive`, {
      dryRun: ctx.options.dryRun,
    });
  const ceph = await ctx
    .sshForNode(nodeId)
    .execRemote(`mountpoint -q ${mountPath} && echo mounted || echo unmounted`, { dryRun: ctx.options.dryRun });

  return {
    wireguardActive: wireguard.stdout.trim() === 'active',
    wireguardPeerCount: Number.parseInt(peerCount.stdout.trim(), 10) || 0,
    swarmActive: swarm.stdout.trim() === 'active',
    cephMounted: ceph.stdout.trim() === 'mounted',
  };
}

async function probeSwarmNodeHostnames(ctx: LoadweaverContext, primaryNodeId: string): Promise<string[]> {
  const result = await ctx
    .sshForNode(primaryNodeId)
    .execRemote(`docker node ls --format '{{.Hostname}}' 2>/dev/null || true`, { dryRun: ctx.options.dryRun });

  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .sort();
}

async function probeSwarmNodeLabels(ctx: LoadweaverContext, primaryNodeId: string): Promise<Record<string, string[]>> {
  const config = ctx.config!;
  const hostnameToNodeId = Object.fromEntries(
    Object.entries(config.nodes).map(([nodeId, node]) => [node.hostname, nodeId]),
  );
  const labels: Record<string, string[]> = {};

  const listing = await ctx
    .sshForNode(primaryNodeId)
    .execRemote(`docker node ls --format '{{.Hostname}}\t{{.ID}}' 2>/dev/null || true`, {
      dryRun: ctx.options.dryRun,
    });

  for (const line of listing.stdout
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean)) {
    const [hostname, dockerNodeId] = line.split('\t');
    const loadweaverNodeId = hostname ? hostnameToNodeId[hostname.trim()] : undefined;

    if (!loadweaverNodeId || !dockerNodeId) {
      continue;
    }

    const inspect = await ctx
      .sshForNode(primaryNodeId)
      .execRemote(
        `docker node inspect ${dockerNodeId.trim()} --format '{{range $k,$v := .Spec.Labels}}{{$k}}={{$v}}\n{{end}}' 2>/dev/null || true`,
        { dryRun: ctx.options.dryRun },
      );

    labels[loadweaverNodeId] = inspect.stdout
      .split('\n')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .sort();
  }

  return labels;
}

async function probeTraefik(
  ctx: LoadweaverContext,
  primaryNodeId: string,
): Promise<{
  deployed: boolean;
  image: string | null;
  serviceVersion: string | null;
  replicas: string | null;
}> {
  const imageResult = await ctx
    .sshForNode(primaryNodeId)
    .execRemote(`docker stack services traefik --format '{{.Image}}' 2>/dev/null | head -n 1`, {
      dryRun: ctx.options.dryRun,
    });
  const versionResult = await ctx
    .sshForNode(primaryNodeId)
    .execRemote(`docker service inspect traefik_traefik --format '{{.Version.Index}}' 2>/dev/null || true`, {
      dryRun: ctx.options.dryRun,
    });
  const replicasResult = await ctx
    .sshForNode(primaryNodeId)
    .execRemote(`docker stack services traefik --format '{{.Name}}:{{.Replicas}}' 2>/dev/null | head -n 1 || true`, {
      dryRun: ctx.options.dryRun,
    });

  const image = imageResult.stdout.trim();

  if (!image) {
    return { deployed: false, image: null, serviceVersion: null, replicas: null };
  }

  return {
    deployed: true,
    image,
    serviceVersion: versionResult.stdout.trim() || null,
    replicas: replicasResult.stdout.trim() || null,
  };
}

async function probeKeepalived(ctx: LoadweaverContext, primaryNodeId: string): Promise<boolean> {
  const result = await ctx
    .sshForNode(primaryNodeId)
    .execRemote(`systemctl is-active keepalived 2>/dev/null || echo inactive`, { dryRun: ctx.options.dryRun });

  return result.stdout.trim() === 'active';
}

async function probeVipHolders(ctx: LoadweaverContext): Promise<Record<string, string | null>> {
  const holders: Record<string, string | null> = {};

  for (const address of listVipAddresses(ctx.config!)) {
    holders[address] = await probeVipHolder(ctx, address);
  }

  return holders;
}

async function probeVipHolder(ctx: LoadweaverContext, vipAddress: string): Promise<string | null> {
  for (const nodeId of Object.keys(ctx.config!.nodes)) {
    const result = await ctx
      .sshForNode(nodeId)
      .execRemote(`ip -4 addr show | grep -F '${vipAddress}' || true`, { dryRun: ctx.options.dryRun });

    if (result.stdout.includes(vipAddress)) {
      return nodeId;
    }
  }

  return null;
}

async function probeCeph(
  ctx: LoadweaverContext,
  primaryNodeId: string,
): Promise<{ health: string | null; monitorCount: number }> {
  const healthResult = await ctx
    .sshForNode(primaryNodeId)
    .execRemote(`ceph -s 2>/dev/null | awk '/health:/ {print $2; exit}' || true`, { dryRun: ctx.options.dryRun });
  const monResult = await ctx
    .sshForNode(primaryNodeId)
    .execRemote(`ceph mon stat 2>/dev/null | awk -F'=' '/mons/{print $2; exit}' | tr -d ' ' || true`, {
      dryRun: ctx.options.dryRun,
    });

  const monitorCount = Number.parseInt(monResult.stdout.trim(), 10);

  return {
    health: healthResult.stdout.trim() || null,
    monitorCount: Number.isNaN(monitorCount) ? 0 : monitorCount,
  };
}
