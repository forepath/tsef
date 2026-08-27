import type { LoadweaverConfig, LoadweaverContext, ResolvedVipPool } from '@forepath/loadweaver/shared/util-cli-core';
import { resolveVipPools } from '@forepath/loadweaver/shared/util-cli-core';

import type { HaproxyFrontendSpec, ResolvedBackendServer } from './haproxy-config.builder';

export async function discoverSwarmTaskIps(ctx: LoadweaverContext, serviceName: string): Promise<string[]> {
  const primary = ctx.config!.cluster.primaryManager;
  const result = await ctx
    .sshForNode(primary)
    .execRemote(
      `docker service ps ${serviceName} --filter desired-state=running --format '{{.ID}}' 2>/dev/null | while read -r id; do docker inspect --format '{{range .NetworksAttachments}}{{range .Addresses}}{{println .}}{{end}}{{end}}' "$id" 2>/dev/null; done`,
      { dryRun: ctx.options.dryRun },
    );

  if (ctx.options.dryRun) {
    return [];
  }

  const ips = result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split('/')[0])
    .filter((ip) => /^\d+\.\d+\.\d+\.\d+$/.test(ip));

  return [...new Set(ips)].sort();
}

export async function resolvePoolFrontends(
  ctx: LoadweaverContext,
  config: LoadweaverConfig,
): Promise<HaproxyFrontendSpec[]> {
  const pools = resolveVipPools(config);
  const frontends: HaproxyFrontendSpec[] = [];
  const swarmCache = new Map<string, string[]>();

  for (const pool of pools) {
    for (const listener of pool.listeners) {
      const servers: ResolvedBackendServer[] = [];
      let index = 0;

      for (const backend of listener.backends) {
        if (backend.type === 'node') {
          const node = config.nodes[backend.nodeId];

          if (!node) {
            continue;
          }

          servers.push({
            name: `${pool.name}_${listener.port}_n${index}`,
            address: node.wireguardIp,
            port: backend.port,
          });
          index += 1;
          continue;
        }

        if (backend.type === 'host') {
          servers.push({
            name: `${pool.name}_${listener.port}_h${index}`,
            address: backend.host,
            port: backend.port,
          });
          index += 1;
          continue;
        }

        let taskIps = swarmCache.get(backend.service);

        if (!taskIps) {
          taskIps = await discoverSwarmTaskIps(ctx, backend.service);
          swarmCache.set(backend.service, taskIps);
        }

        for (const ip of taskIps) {
          servers.push({
            name: `${pool.name}_${listener.port}_s${index}`,
            address: ip,
            port: backend.port,
          });
          index += 1;
        }
      }

      frontends.push({
        name: `${sanitizeName(pool.name)}_${listener.port}`,
        port: listener.port,
        protocol: listener.protocol,
        servers,
      });
    }
  }

  return frontends;
}

export function poolsHaveListeners(pools: ResolvedVipPool[]): boolean {
  return pools.some((pool) => pool.listeners.length > 0);
}

function sanitizeName(value: string): string {
  return value.replace(/[^A-Za-z0-9_]/g, '_');
}
