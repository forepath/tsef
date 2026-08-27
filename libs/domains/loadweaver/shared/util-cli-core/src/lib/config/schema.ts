import { z } from 'zod';

import { cidrContainsIp, cidrsOverlap } from '../services/derive-cluster-cidr.service';
import { vipPoolSchema } from './vip-pool.schema';

export const nodeRoles = ['manager', 'worker', 'ceph-mon', 'ceph-mgr', 'ceph-mds', 'ceph-osd'] as const;

type RoutingValidationConfig = {
  nodes: Record<string, { wireguardIp: string; roles: string[] }>;
  sites?: Array<{ nodes: string[] }>;
  routing?: {
    enabled?: boolean;
    hubNodes?: string[];
    clusterCidr?: string;
    localAsn?: number;
    peers?: Array<{
      name: string;
      remoteAsn: number;
      neighbor: string;
      wireguardPeer?: { allowedIps: string[] };
    }>;
  };
};

function resolveRoutingHubNodesForValidation(config: RoutingValidationConfig): string[] {
  if (!config.routing?.enabled) {
    return [];
  }

  if (config.routing.hubNodes && config.routing.hubNodes.length > 0) {
    return [...config.routing.hubNodes].sort();
  }

  if (config.sites && config.sites.length > 0) {
    const hubs: string[] = [];

    for (const site of config.sites) {
      const manager = [...site.nodes].filter((nodeId) => config.nodes[nodeId]?.roles.includes('manager')).sort()[0];

      if (manager) {
        hubs.push(manager);
      }
    }

    if (hubs.length > 0) {
      return [...new Set(hubs)].sort();
    }
  }

  return Object.keys(config.nodes)
    .filter((nodeId) => config.nodes[nodeId].roles.includes('manager'))
    .sort();
}

function deriveClusterCidrForValidation(config: RoutingValidationConfig): string {
  if (config.routing?.clusterCidr) {
    return config.routing.clusterCidr;
  }

  const ips = Object.values(config.nodes)
    .map((node) => node.wireguardIp)
    .sort();

  const octets = ips[0].split('.');
  return `${octets[0]}.${octets[1]}.${octets[2]}.0/24`;
}

export const loadweaverConfigSchema = z
  .object({
    version: z.number().int().default(1),
    profile: z.string().optional(),
    cluster: z.object({
      name: z.string().min(1),
      primaryManager: z.string().min(1),
    }),
    sites: z
      .array(
        z.object({
          name: z.string().min(1),
          nodes: z.array(z.string().min(1)).min(1),
        }),
      )
      .optional(),
    nodes: z.record(
      z.string(),
      z.object({
        hostname: z.string().min(1),
        publicIp: z.string().optional(),
        privateIp: z.string().optional(),
        wireguardIp: z.string().min(1),
        wireguardEndpoint: z.string().optional(),
        roles: z.array(z.enum(nodeRoles)).min(1),
        osdDevice: z.string().min(1).optional(),
        sshUser: z.string().optional(),
        sshPort: z.number().int().optional(),
        identityFile: z.string().optional(),
        proxyJump: z.string().optional(),
      }),
    ),
    ssh: z
      .object({
        user: z.string().optional(),
        port: z.number().int().optional(),
        identityFile: z.string().optional(),
        proxyJump: z.string().optional(),
        connectTimeoutSeconds: z.number().int().min(0).optional(),
        serverAliveIntervalSeconds: z.number().int().min(0).optional(),
      })
      .optional(),
    wireguard: z
      .object({
        interface: z.string().default('wg0'),
        port: z.number().int().default(51820),
        mtu: z.number().int().default(1420),
        keyRotation: z
          .object({
            enabled: z.boolean().default(false),
            intervalDays: z.number().int().min(1).default(90),
            warnBeforeDays: z.number().int().min(0).default(14),
          })
          .default({ enabled: false, intervalDays: 90, warnBeforeDays: 14 }),
      })
      .default({
        interface: 'wg0',
        port: 51820,
        mtu: 1420,
        keyRotation: { enabled: false, intervalDays: 90, warnBeforeDays: 14 },
      }),
    swarm: z
      .object({
        advertiseInterface: z.string().default('wg0'),
        overlayNetworks: z.array(z.string()).default(['traefik-public']),
        overlayMtu: z.number().int().optional(),
      })
      .default({ advertiseInterface: 'wg0', overlayNetworks: ['traefik-public'] }),
    ceph: z
      .object({
        fsName: z.string().default('loadweaverfs'),
        mountPath: z.string().default('/mnt/cephfs'),
        replication: z.number().int().min(1).default(3),
        release: z.string().default('quincy'),
      })
      .default({ fsName: 'loadweaverfs', mountPath: '/mnt/cephfs', replication: 3, release: 'quincy' }),
    traefik: z
      .object({
        image: z.string().default('traefik:v3'),
        network: z.string().default('traefik-public'),
        mode: z.enum(['global', 'replicated']).default('global'),
        acme: z
          .object({
            email: z.string().email(),
            challengeType: z.enum(['http', 'dns']).default('http'),
            dnsProvider: z.enum(['cloudflare', 'route53', 'digitalocean']).optional(),
            envFile: z.string().default('/etc/loadweaver/traefik-acme.env'),
            storagePath: z.string().default('/letsencrypt/acme.json'),
          })
          .optional(),
      })
      .default({ image: 'traefik:v3', network: 'traefik-public', mode: 'global' }),
    vip: z
      .object({
        address: z.string().min(1).optional(),
        interface: z.string().default('eth0'),
        backend: z.enum(['keepalived', 'haproxy']).default('keepalived'),
        routerId: z.number().int().min(1).max(255).optional(),
        authPass: z.string().min(1).max(8).optional(),
        pools: z.array(vipPoolSchema).default([]),
      })
      .optional(),
    routing: z
      .object({
        enabled: z.boolean().default(false),
        localAsn: z.number().int().min(64512).max(65534).optional(),
        clusterCidr: z.string().optional(),
        hubNodes: z.array(z.string().min(1)).optional(),
        exportWireguardSubnet: z.boolean().default(true),
        peers: z
          .array(
            z.object({
              name: z.string().min(1),
              remoteAsn: z.number().int().min(1).max(4294967295),
              neighbor: z.string().min(1),
              multihop: z.boolean().default(false),
              importFilter: z.enum(['accept', 'none']).default('accept'),
              exportFilter: z.enum(['cluster', 'none']).default('cluster'),
              wireguardPeer: z
                .object({
                  publicKey: z.string().min(1),
                  endpoint: z.string().min(1),
                  allowedIps: z.array(z.string().min(1)).min(1),
                  interface: z.string().default('wg1'),
                  listenPort: z.number().int().optional(),
                  localAddress: z.string().optional(),
                })
                .optional(),
            }),
          )
          .default([]),
      })
      .optional(),
    volumes: z
      .array(
        z.object({
          name: z.string().min(1),
          path: z.string().min(1),
        }),
      )
      .default([]),
    host: z
      .object({
        configureFirewall: z.boolean().default(true),
        aptProxy: z.string().optional(),
      })
      .default({ configureFirewall: true }),
    profiles: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
  })
  .superRefine((config, ctx) => {
    const nodeIds = Object.keys(config.nodes);

    for (const site of config.sites ?? []) {
      for (const nodeId of site.nodes) {
        if (!config.nodes[nodeId]) {
          ctx.addIssue({
            code: 'custom',
            message: `Site ${site.name} references unknown node: ${nodeId}`,
            path: ['sites'],
          });
        }
      }
    }

    if (!config.nodes[config.cluster.primaryManager]) {
      ctx.addIssue({
        code: 'custom',
        message: `primaryManager ${config.cluster.primaryManager} is not defined in nodes`,
        path: ['cluster', 'primaryManager'],
      });
    }

    const managers = nodeIds.filter((id) => config.nodes[id].roles.includes('manager'));

    if (managers.length > 0 && managers.length < 3 && config.profile === 'prod') {
      ctx.addIssue({
        code: 'custom',
        message: 'Production clusters should have at least 3 manager nodes for quorum',
        path: ['nodes'],
      });
    }

    for (const nodeId of nodeIds) {
      const duplicateIp = nodeIds.filter((id) => config.nodes[id].wireguardIp === config.nodes[nodeId].wireguardIp);

      if (duplicateIp.length > 1) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate wireguardIp for node ${nodeId}`,
          path: ['nodes', nodeId, 'wireguardIp'],
        });
      }
    }

    if (config.traefik.acme?.challengeType === 'dns' && !config.traefik.acme.dnsProvider) {
      ctx.addIssue({
        code: 'custom',
        message: 'traefik.acme.dnsProvider is required when challengeType is dns',
        path: ['traefik', 'acme', 'dnsProvider'],
      });
    }

    if (config.routing?.enabled) {
      if (!config.routing.localAsn) {
        ctx.addIssue({
          code: 'custom',
          message: 'routing.localAsn is required when routing.enabled is true',
          path: ['routing', 'localAsn'],
        });
      }

      const hubNodes = resolveRoutingHubNodesForValidation(config);

      if (hubNodes.length === 0) {
        ctx.addIssue({
          code: 'custom',
          message: 'At least one routing hub node is required when routing is enabled',
          path: ['routing', 'hubNodes'],
        });
      }

      const hubSet = new Set<string>();

      for (const hubNodeId of config.routing.hubNodes ?? []) {
        if (!config.nodes[hubNodeId]) {
          ctx.addIssue({
            code: 'custom',
            message: `routing.hubNodes references unknown node: ${hubNodeId}`,
            path: ['routing', 'hubNodes'],
          });
        }

        if (hubSet.has(hubNodeId)) {
          ctx.addIssue({
            code: 'custom',
            message: `Duplicate routing hub node: ${hubNodeId}`,
            path: ['routing', 'hubNodes'],
          });
        }

        hubSet.add(hubNodeId);
      }

      let clusterCidr: string | undefined;

      try {
        clusterCidr = deriveClusterCidrForValidation(config);
      } catch (error: unknown) {
        ctx.addIssue({
          code: 'custom',
          message: error instanceof Error ? error.message : String(error),
          path: ['routing', 'clusterCidr'],
        });
      }

      if (clusterCidr) {
        for (const nodeId of nodeIds) {
          const wireguardIp = config.nodes[nodeId].wireguardIp;

          if (!cidrContainsIp(clusterCidr, wireguardIp)) {
            ctx.addIssue({
              code: 'custom',
              message: `Node ${nodeId} wireguardIp ${wireguardIp} is outside routing.clusterCidr ${clusterCidr}`,
              path: ['nodes', nodeId, 'wireguardIp'],
            });
          }
        }
      }

      const peerNames = new Set<string>();

      for (const [index, peer] of (config.routing.peers ?? []).entries()) {
        if (peerNames.has(peer.name)) {
          ctx.addIssue({
            code: 'custom',
            message: `Duplicate routing peer name: ${peer.name}`,
            path: ['routing', 'peers', index, 'name'],
          });
        }

        peerNames.add(peer.name);

        if (config.routing.localAsn && peer.remoteAsn === config.routing.localAsn) {
          const isIntraHub = hubNodes.some((hubId) => config.nodes[hubId]?.wireguardIp === peer.neighbor);

          if (!isIntraHub) {
            ctx.addIssue({
              code: 'custom',
              message: `routing.peers[${peer.name}] remoteAsn must differ from localAsn for eBGP peers`,
              path: ['routing', 'peers', index, 'remoteAsn'],
            });
          }
        }

        if (clusterCidr && peer.wireguardPeer) {
          for (const allowedIp of peer.wireguardPeer.allowedIps) {
            if (cidrsOverlap(clusterCidr, allowedIp)) {
              ctx.addIssue({
                code: 'custom',
                message: `Peer ${peer.name} wireguardPeer.allowedIps overlaps local cluster CIDR ${clusterCidr}`,
                path: ['routing', 'peers', index, 'wireguardPeer', 'allowedIps'],
              });
            }
          }
        }
      }
    }

    if (config.vip) {
      const pools = config.vip.pools ?? [];

      if (!config.vip.address && pools.length === 0) {
        ctx.addIssue({
          code: 'custom',
          message: 'vip requires address and/or at least one pool',
          path: ['vip'],
        });
      }

      const poolNames = new Set<string>();
      const addresses = new Set<string>();
      const routerIds = new Set<number>();

      if (config.vip.address) {
        addresses.add(config.vip.address);
      }

      if (config.vip.routerId !== undefined) {
        routerIds.add(config.vip.routerId);
      }

      for (const [poolIndex, pool] of pools.entries()) {
        if (poolNames.has(pool.name)) {
          ctx.addIssue({
            code: 'custom',
            message: `Duplicate vip pool name: ${pool.name}`,
            path: ['vip', 'pools', poolIndex, 'name'],
          });
        }

        poolNames.add(pool.name);

        if (addresses.has(pool.address)) {
          ctx.addIssue({
            code: 'custom',
            message: `Duplicate vip address: ${pool.address}`,
            path: ['vip', 'pools', poolIndex, 'address'],
          });
        }

        addresses.add(pool.address);

        if (pool.routerId !== undefined) {
          if (routerIds.has(pool.routerId)) {
            ctx.addIssue({
              code: 'custom',
              message: `Duplicate vip routerId: ${pool.routerId}`,
              path: ['vip', 'pools', poolIndex, 'routerId'],
            });
          }

          routerIds.add(pool.routerId);
        }

        const listenerPorts = new Set<number>();

        for (const [listenerIndex, listener] of pool.listeners.entries()) {
          if (listenerPorts.has(listener.port)) {
            ctx.addIssue({
              code: 'custom',
              message: `Duplicate listener port ${listener.port} in vip pool ${pool.name}`,
              path: ['vip', 'pools', poolIndex, 'listeners', listenerIndex, 'port'],
            });
          }

          listenerPorts.add(listener.port);

          for (const [backendIndex, backend] of listener.backends.entries()) {
            if (backend.type === 'node' && !config.nodes[backend.nodeId]) {
              ctx.addIssue({
                code: 'custom',
                message: `vip pool ${pool.name} references unknown node: ${backend.nodeId}`,
                path: ['vip', 'pools', poolIndex, 'listeners', listenerIndex, 'backends', backendIndex, 'nodeId'],
              });
            }
          }
        }
      }
    }
  });

export type LoadweaverConfig = z.infer<typeof loadweaverConfigSchema>;
