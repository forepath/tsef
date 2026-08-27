import type { LoadweaverConfig } from '../config/schema';
import type { VipPool } from '../config/vip-pool.schema';

export type ResolvedVipPool = VipPool & {
  interface: string;
  routerId: number;
  authPass: string;
  healthCheck: {
    type: 'tcp' | 'http';
    port: number;
    path: string;
  };
};

export type VipPoolFingerprint = {
  name: string;
  address: string;
  routerId: number;
  interface: string;
  listeners: Array<{
    port: number;
    protocol: string;
    backends: Array<string>;
  }>;
  healthCheck: { type: string; port: number; path: string };
};

export type VipStateSnapshot = {
  configured: boolean;
  traefikAddress: string | null;
  traefikRouterId: number | null;
  pools: VipPoolFingerprint[];
  fingerprint: string;
  hasListeners: boolean;
  hasSwarmBackends: boolean;
  listenerPorts: number[];
};

const DEFAULT_AUTH_PASS = 'loadwv01';
const DEFAULT_TRAEFIK_ROUTER_ID = 51;

function backendFingerprint(backend: VipPool['listeners'][number]['backends'][number]): string {
  switch (backend.type) {
    case 'node':
      return `node:${backend.nodeId}:${backend.port}`;
    case 'host':
      return `host:${backend.host}:${backend.port}`;
    case 'swarm':
      return `swarm:${backend.service}:${backend.port}`;
    default: {
      const exhaustive: never = backend;
      return String(exhaustive);
    }
  }
}

function allocateRouterIds(config: NonNullable<LoadweaverConfig['vip']>): Map<string, number> {
  const assigned = new Map<string, number>();
  const used = new Set<number>();

  if (config.address) {
    const routerId = config.routerId ?? DEFAULT_TRAEFIK_ROUTER_ID;
    assigned.set('__traefik__', routerId);
    used.add(routerId);
  }

  let next = Math.max(DEFAULT_TRAEFIK_ROUTER_ID, ...used, 0) + 1;

  for (const pool of config.pools ?? []) {
    if (pool.routerId !== undefined) {
      assigned.set(pool.name, pool.routerId);
      used.add(pool.routerId);
      continue;
    }

    while (used.has(next) || next > 255) {
      next += 1;
    }

    assigned.set(pool.name, next);
    used.add(next);
    next += 1;
  }

  return assigned;
}

export function resolveVipPools(config: LoadweaverConfig): ResolvedVipPool[] {
  if (!config.vip) {
    return [];
  }

  const routerIds = allocateRouterIds(config.vip);
  const defaultAuth = config.vip.authPass ?? DEFAULT_AUTH_PASS;

  return (config.vip.pools ?? []).map((pool) => {
    const firstListenerPort = pool.listeners[0]?.port;
    const healthPort = pool.healthCheck.port ?? firstListenerPort ?? 80;

    return {
      ...pool,
      interface: pool.interface ?? config.vip!.interface,
      routerId: routerIds.get(pool.name)!,
      authPass: pool.authPass ?? defaultAuth,
      healthCheck: {
        type: pool.healthCheck.type,
        port: healthPort,
        path: pool.healthCheck.path,
      },
    };
  });
}

export function deriveVipStateSnapshot(config: LoadweaverConfig): VipStateSnapshot {
  if (!config.vip) {
    return {
      configured: false,
      traefikAddress: null,
      traefikRouterId: null,
      pools: [],
      fingerprint: '',
      hasListeners: false,
      hasSwarmBackends: false,
      listenerPorts: [],
    };
  }

  const routerIds = allocateRouterIds(config.vip);
  const pools = resolveVipPools(config).map((pool) => ({
    name: pool.name,
    address: pool.address,
    routerId: pool.routerId,
    interface: pool.interface,
    listeners: pool.listeners.map((listener) => ({
      port: listener.port,
      protocol: listener.protocol,
      backends: listener.backends.map(backendFingerprint).sort(),
    })),
    healthCheck: pool.healthCheck,
  }));

  pools.sort((left, right) => left.name.localeCompare(right.name));

  const listenerPorts = [...new Set(pools.flatMap((pool) => pool.listeners.map((listener) => listener.port)))].sort(
    (left, right) => left - right,
  );
  const hasSwarmBackends = pools.some((pool) =>
    pool.listeners.some((listener) => listener.backends.some((backend) => backend.startsWith('swarm:'))),
  );

  const fingerprint = JSON.stringify({
    traefikAddress: config.vip.address ?? null,
    traefikRouterId: config.vip.address ? (routerIds.get('__traefik__') ?? null) : null,
    pools,
  });

  return {
    configured: true,
    traefikAddress: config.vip.address ?? null,
    traefikRouterId: config.vip.address ? (routerIds.get('__traefik__') ?? null) : null,
    pools,
    fingerprint,
    hasListeners: listenerPorts.length > 0,
    hasSwarmBackends,
    listenerPorts,
  };
}

export function vipStateChanged(previous: string | undefined, current: VipStateSnapshot): boolean {
  if (!current.configured) {
    return Boolean(previous);
  }

  return previous !== current.fingerprint;
}

export function listVipAddresses(config: LoadweaverConfig): string[] {
  if (!config.vip) {
    return [];
  }

  const addresses: string[] = [];

  if (config.vip.address) {
    addresses.push(config.vip.address);
  }

  for (const pool of config.vip.pools ?? []) {
    addresses.push(pool.address);
  }

  return addresses;
}
