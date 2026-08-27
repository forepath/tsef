import type { LoadweaverConfig } from '@forepath/loadweaver/shared/util-cli-core';

import { deriveStateFromConfig } from './cluster-state';
import { AUTH_PASS_REDACTED } from './sanitize-desired-config';

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

describe('deriveStateFromConfig', () => {
  it('starts inventory serial at 1 and stores a sanitized desired config', () => {
    const state = deriveStateFromConfig(config);

    expect(state.inventorySerial).toBe(1);
    expect(state.desired?.vip?.authPass).toBe(AUTH_PASS_REDACTED);
    expect(state.nodes).toEqual(['node-a1']);
  });

  it('increments inventory serial from previous state', () => {
    const previous = deriveStateFromConfig(config);
    const next = deriveStateFromConfig(config, undefined, { previous, bumpSerial: true });

    expect(next.inventorySerial).toBe(2);
  });
});
