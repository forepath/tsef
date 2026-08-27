import type { LoadweaverConfig } from '@forepath/loadweaver/shared/util-cli-core';

import { buildKeepalivedConfig } from './keepalived-config.builder';

const baseConfig: LoadweaverConfig = {
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
    authPass: 'loadwv01',
    pools: [
      {
        name: 'postgres',
        address: '203.0.113.101',
        healthCheck: { type: 'tcp', path: '/' },
        listeners: [
          {
            port: 5432,
            protocol: 'tcp',
            backends: [{ type: 'host', host: '10.200.0.50', port: 5432 }],
          },
        ],
      },
    ],
  },
};

describe('buildKeepalivedConfig', () => {
  it('renders Traefik and pool VRRP instances with independent health checks', () => {
    const config = buildKeepalivedConfig(baseConfig, 100);

    expect(config).toContain('vrrp_instance VI_traefik');
    expect(config).toContain('chk_traefik');
    expect(config).toContain('curl -f http://127.0.0.1:80/');
    expect(config).toContain('203.0.113.100');
    expect(config).toContain('vrrp_instance VI_postgres');
    expect(config).toContain('chk_pool_postgres');
    expect(config).toContain('nc -z 127.0.0.1 5432');
    expect(config).toContain('203.0.113.101');
    expect(config).toContain('virtual_router_id 52');
  });
});
