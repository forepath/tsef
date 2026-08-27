import type { LoadweaverConfig } from '../config/schema';
import { cidrContainsIp, cidrsOverlap, deriveClusterCidr } from './derive-cluster-cidr.service';

function baseConfig(overrides: Partial<LoadweaverConfig> = {}): LoadweaverConfig {
  return {
    version: 1,
    cluster: { name: 'test', primaryManager: 'node-a1' },
    nodes: {
      'node-a1': {
        hostname: 'a1.example.com',
        wireguardIp: '10.200.0.1',
        roles: ['manager'],
      },
      'node-b1': {
        hostname: 'b1.example.com',
        wireguardIp: '10.200.0.4',
        roles: ['manager'],
      },
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
    volumes: [],
    host: { configureFirewall: true },
    ...overrides,
  };
}

describe('deriveClusterCidr', () => {
  it('derives /24 from the first sorted wireguard IP', () => {
    expect(deriveClusterCidr(baseConfig())).toBe('10.200.0.0/24');
  });

  it('uses explicit clusterCidr when configured', () => {
    expect(
      deriveClusterCidr(
        baseConfig({
          routing: {
            enabled: true,
            localAsn: 64512,
            exportWireguardSubnet: true,
            peers: [],
            clusterCidr: '10.200.0.0/23',
          },
        }),
      ),
    ).toBe('10.200.0.0/23');
  });
});

describe('cidr helpers', () => {
  it('checks membership and overlap', () => {
    expect(cidrContainsIp('10.200.0.0/24', '10.200.0.4')).toBe(true);
    expect(cidrContainsIp('10.200.0.0/24', '10.201.0.1')).toBe(false);
    expect(cidrsOverlap('10.200.0.0/24', '10.200.0.128/25')).toBe(true);
    expect(cidrsOverlap('10.200.0.0/24', '10.201.0.0/24')).toBe(false);
  });
});
