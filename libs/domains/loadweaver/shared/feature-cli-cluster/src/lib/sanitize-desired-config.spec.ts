import type { LoadweaverConfig } from '@forepath/loadweaver/shared/util-cli-core';

import { AUTH_PASS_REDACTED, sanitizeDesiredConfig } from './sanitize-desired-config';

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
  swarm: { advertiseInterface: 'wg0', overlayNetworks: ['traefik-public'] },
  ceph: { fsName: 'fs', mountPath: '/mnt/cephfs', replication: 3, release: 'quincy' },
  traefik: { image: 'traefik:v3', network: 'traefik-public', mode: 'global' },
  host: { configureFirewall: true },
  volumes: [],
  vip: {
    address: '10.200.0.100',
    interface: 'eth0',
    backend: 'keepalived',
    authPass: 'secret01',
    pools: [],
  },
};

describe('sanitizeDesiredConfig', () => {
  it('redacts vip.authPass without mutating the source config', () => {
    const sanitized = sanitizeDesiredConfig(config);

    expect(sanitized.vip?.authPass).toBe(AUTH_PASS_REDACTED);
    expect(config.vip?.authPass).toBe('secret01');
  });

  it('redacts pool authPass values', () => {
    const withPools: LoadweaverConfig = {
      ...config,
      vip: {
        ...config.vip!,
        pools: [
          {
            name: 'postgres',
            address: '10.200.0.101',
            authPass: 'poolpass',
            healthCheck: { type: 'tcp', path: '/' },
            listeners: [],
          },
        ],
      },
    };

    const sanitized = sanitizeDesiredConfig(withPools);

    expect(sanitized.vip?.pools?.[0].authPass).toBe(AUTH_PASS_REDACTED);
    expect(withPools.vip?.pools?.[0].authPass).toBe('poolpass');
  });
});
