import { deriveOsdDevices, diffOsdDeviceChanges } from './derive-osd-devices.service';
import type { LoadweaverConfig } from '../config/schema';

const config: LoadweaverConfig = {
  version: 1,
  cluster: { name: 'test', primaryManager: 'node-a1' },
  nodes: {
    'node-a1': { hostname: 'a1', wireguardIp: '10.200.0.1', roles: ['manager', 'ceph-osd'], osdDevice: '/dev/sdb' },
    'node-a2': { hostname: 'a2', wireguardIp: '10.200.0.2', roles: ['worker', 'ceph-osd'] },
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
};

describe('derive osd devices', () => {
  it('collects osdDevice only for ceph-osd nodes', () => {
    expect(deriveOsdDevices(config)).toEqual({ 'node-a1': '/dev/sdb' });
  });

  it('detects osd device changes for existing nodes', () => {
    const changed = diffOsdDeviceChanges(
      { 'node-a1': '/dev/sdb' },
      {
        ...config,
        nodes: {
          ...config.nodes,
          'node-a2': { ...config.nodes['node-a2'], osdDevice: '/dev/sdc' },
        },
      },
    );

    expect(changed).toEqual(['node-a2']);
  });
});
