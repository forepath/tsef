import type { LoadweaverConfig } from '@forepath/loadweaver/shared/util-cli-core';

import { buildBirdConfig, buildBirdPeerDefinitions } from './bird-config.builder';

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
    sites: [
      { name: 'site-a', nodes: ['node-a1'] },
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
    routing: {
      enabled: true,
      localAsn: 64512,
      exportWireguardSubnet: true,
      peers: [
        {
          name: 'staging',
          remoteAsn: 64513,
          neighbor: '10.201.0.1',
          multihop: false,
          importFilter: 'accept',
          exportFilter: 'cluster',
          wireguardPeer: {
            publicKey: 'remote-public-key',
            endpoint: 'staging.example.com:51821',
            allowedIps: ['10.201.0.0/24'],
            interface: 'wg1',
            listenPort: 51821,
          },
        },
      ],
    },
    ...overrides,
  };
}

describe('buildBirdPeerDefinitions', () => {
  it('includes iBGP hub peers and external eBGP peers', () => {
    const peers = buildBirdPeerDefinitions(baseConfig(), 'node-a1');

    expect(peers.map((peer) => peer.protocolName)).toEqual(['hub_node_b1', 'peer_staging']);
    expect(peers[0]).toMatchObject({ neighbor: '10.200.0.4', remoteAsn: 64512 });
    expect(peers[1]).toMatchObject({ neighbor: '10.201.0.1', remoteAsn: 64513 });
  });
});

describe('buildBirdConfig', () => {
  it('renders BIRD config with router id, static route, and BGP protocols', () => {
    const config = buildBirdConfig(baseConfig(), 'node-a1');

    expect(config).toContain('router id 10.200.0.1;');
    expect(config).toContain('protocol bgp hub_node_b1');
    expect(config).toContain('protocol bgp peer_staging');
    expect(config).toContain('route 10.200.0.0/24 via "wg0"');
    expect(config).toContain('filter cluster_export');
  });
});
