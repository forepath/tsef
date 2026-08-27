import type { LoadweaverConfig } from '../config/schema';
import { isRoutingHub, resolveRoutingHubNodes } from './resolve-routing-hubs.service';

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
      'node-a2': {
        hostname: 'a2.example.com',
        wireguardIp: '10.200.0.2',
        roles: ['worker'],
      },
      'node-b1': {
        hostname: 'b1.example.com',
        wireguardIp: '10.200.0.4',
        roles: ['manager'],
      },
    },
    sites: [
      { name: 'site-a', nodes: ['node-a1', 'node-a2'] },
      { name: 'site-b', nodes: ['node-b1'] },
    ],
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

describe('resolveRoutingHubNodes', () => {
  it('returns empty list when routing is disabled', () => {
    expect(resolveRoutingHubNodes(baseConfig())).toEqual([]);
  });

  it('uses explicit hubNodes when routing is enabled', () => {
    expect(
      resolveRoutingHubNodes(
        baseConfig({
          routing: {
            enabled: true,
            localAsn: 64512,
            exportWireguardSubnet: true,
            peers: [],
            hubNodes: ['node-a2', 'node-b1'],
          },
        }),
      ),
    ).toEqual(['node-a2', 'node-b1']);
  });

  it('derives first manager per site when hubNodes are omitted', () => {
    expect(
      resolveRoutingHubNodes(
        baseConfig({
          routing: {
            enabled: true,
            localAsn: 64512,
            exportWireguardSubnet: true,
            peers: [],
          },
        }),
      ),
    ).toEqual(['node-a1', 'node-b1']);
  });

  it('identifies routing hubs per node', () => {
    const config = baseConfig({
      routing: {
        enabled: true,
        localAsn: 64512,
        exportWireguardSubnet: true,
        peers: [],
        hubNodes: ['node-a1'],
      },
    });

    expect(isRoutingHub(config, 'node-a1')).toBe(true);
    expect(isRoutingHub(config, 'node-a2')).toBe(false);
  });
});
