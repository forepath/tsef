import type { LoadweaverConfig, LoadweaverContext } from '@forepath/loadweaver/shared/util-cli-core';

import { resolvePoolFrontends } from './backend-resolution.service';

const config: LoadweaverConfig = {
  version: 1,
  cluster: { name: 'prod', primaryManager: 'node-a1' },
  nodes: {
    'node-a1': { hostname: 'a1', wireguardIp: '10.200.0.1', roles: ['manager'] },
  },
  wireguard: {
    interface: 'wg0',
    port: 51820,
    mtu: 1420,
    keyRotation: { enabled: false, intervalDays: 90, warnBeforeDays: 14 },
  },
  swarm: { advertiseInterface: 'wg0', overlayNetworks: [] },
  ceph: { fsName: 'fs', mountPath: '/mnt/cephfs', replication: 3, release: 'quincy' },
  traefik: { image: 'traefik:v3', network: 'traefik-public', mode: 'global' },
  host: { configureFirewall: true },
  volumes: [],
  vip: {
    address: '203.0.113.100',
    interface: 'eth0',
    backend: 'keepalived',
    pools: [
      {
        name: 'postgres',
        address: '203.0.113.101',
        healthCheck: { type: 'tcp', path: '/' },
        listeners: [
          {
            port: 5432,
            protocol: 'tcp',
            backends: [
              { type: 'node', nodeId: 'node-a1', port: 5432 },
              { type: 'host', host: '10.200.0.50', port: 5432 },
              { type: 'swarm', service: 'postgres', port: 5432 },
            ],
          },
        ],
      },
    ],
  },
};

describe('resolvePoolFrontends', () => {
  it('resolves node and host backends and leaves swarm empty in dry-run', async () => {
    const ctx = {
      options: { dryRun: true },
      config,
      sshForNode: () => ({
        execRemote: async (command: string) => ({
          command,
          stdout: '',
          stderr: '',
          exitCode: 0,
          dryRun: true,
        }),
      }),
    } as unknown as LoadweaverContext;

    const frontends = await resolvePoolFrontends(ctx, config);

    expect(frontends).toHaveLength(1);
    expect(frontends[0].servers).toEqual([
      { name: 'postgres_5432_n0', address: '10.200.0.1', port: 5432 },
      { name: 'postgres_5432_h1', address: '10.200.0.50', port: 5432 },
    ]);
  });
});
