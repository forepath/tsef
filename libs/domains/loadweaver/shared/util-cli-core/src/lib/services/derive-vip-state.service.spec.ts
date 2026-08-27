import type { LoadweaverConfig } from '../config/schema';
import { deriveVipStateSnapshot, listVipAddresses, resolveVipPools, vipStateChanged } from './derive-vip-state.service';

const config: LoadweaverConfig = {
  version: 1,
  cluster: { name: 'prod', primaryManager: 'node-a1' },
  nodes: {
    'node-a1': { hostname: 'a1', wireguardIp: '10.200.0.1', roles: ['manager'] },
    'node-a2': { hostname: 'a2', wireguardIp: '10.200.0.2', roles: ['worker'] },
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
              { type: 'swarm', service: 'postgres', port: 5432 },
            ],
          },
        ],
      },
    ],
  },
};

describe('deriveVipStateSnapshot', () => {
  it('resolves pools, fingerprints, and swarm backend flags', () => {
    const pools = resolveVipPools(config);
    expect(pools[0].routerId).toBe(52);
    expect(pools[0].healthCheck.port).toBe(5432);

    const snapshot = deriveVipStateSnapshot(config);
    expect(snapshot.configured).toBe(true);
    expect(snapshot.hasListeners).toBe(true);
    expect(snapshot.hasSwarmBackends).toBe(true);
    expect(snapshot.listenerPorts).toEqual([5432]);
    expect(listVipAddresses(config)).toEqual(['203.0.113.100', '203.0.113.101']);
    expect(vipStateChanged(undefined, snapshot)).toBe(true);
    expect(vipStateChanged(snapshot.fingerprint, snapshot)).toBe(false);
  });
});
