import type { LoadweaverConfig } from '@forepath/loadweaver/shared/util-cli-core';

import { detectRemoteDrift } from './drift-detector';
import type { RemoteFingerprint } from './remote-fingerprint';

const config: LoadweaverConfig = {
  version: 1,
  cluster: { name: 'test', primaryManager: 'node-a1' },
  nodes: {
    'node-a1': { hostname: 'a1.example.com', wireguardIp: '10.200.0.1', roles: ['manager'] },
    'node-a2': { hostname: 'a2.example.com', wireguardIp: '10.200.0.2', roles: ['worker'] },
  },
  wireguard: {
    interface: 'wg0',
    port: 51820,
    mtu: 1420,
    keyRotation: { enabled: false, intervalDays: 90, warnBeforeDays: 14 },
  },
  swarm: { advertiseInterface: 'wg0', overlayNetworks: ['traefik-public'] },
  ceph: { fsName: 'fs', mountPath: '/mnt/cephfs', replication: 3, release: 'quincy' },
  traefik: { image: 'traefik:v3', network: 'traefik-public', mode: 'global' as const },
  host: { configureFirewall: true },
  volumes: [],
};

function fingerprint(overrides: Partial<RemoteFingerprint> = {}): RemoteFingerprint {
  return {
    capturedAt: '2026-01-01T00:00:00.000Z',
    swarmNodeHostnames: ['a1.example.com', 'a2.example.com'],
    swarmNodeLabels: {
      'node-a1': ['site=a'],
      'node-a2': ['site=a'],
    },
    traefikImage: 'traefik:v3',
    traefikDeployed: true,
    traefikServiceVersion: '42',
    traefikReplicas: 'traefik_traefik:2/2',
    vipKeepalivedActive: false,
    vipHolderNodeId: null,
    vipHolders: {},
    cephHealth: 'HEALTH_OK',
    cephMonitorCount: 3,
    nodes: {
      'node-a1': { wireguardActive: true, wireguardPeerCount: 1, swarmActive: true, cephMounted: true },
      'node-a2': { wireguardActive: true, wireguardPeerCount: 1, swarmActive: true, cephMounted: true },
    },
    ...overrides,
  };
}

describe('detectRemoteDrift', () => {
  it('reports traefik image changes', () => {
    const drifts = detectRemoteDrift(fingerprint(), fingerprint({ traefikImage: 'traefik:v2' }), config);

    expect(drifts.some((drift) => drift.code === 'traefik.image')).toBe(true);
  });

  it('reports traefik service revision changes', () => {
    const drifts = detectRemoteDrift(fingerprint(), fingerprint({ traefikServiceVersion: '99' }), config);

    expect(drifts.some((drift) => drift.code === 'traefik.revision')).toBe(true);
  });

  it('reports swarm label changes', () => {
    const drifts = detectRemoteDrift(
      fingerprint(),
      fingerprint({
        swarmNodeLabels: {
          'node-a1': ['site=b'],
          'node-a2': ['site=a'],
        },
      }),
      config,
    );

    expect(drifts.some((drift) => drift.code === 'swarm.labels')).toBe(true);
  });

  it('reports wireguard deactivation on a managed node', () => {
    const drifts = detectRemoteDrift(
      fingerprint(),
      fingerprint({
        nodes: {
          'node-a1': { wireguardActive: false, wireguardPeerCount: 0, swarmActive: true, cephMounted: true },
          'node-a2': { wireguardActive: true, wireguardPeerCount: 1, swarmActive: true, cephMounted: true },
        },
      }),
      config,
    );

    expect(drifts.some((drift) => drift.code === 'node.node-a1.wireguard')).toBe(true);
  });

  it('reports unexpected wireguard peer counts', () => {
    const drifts = detectRemoteDrift(
      fingerprint(),
      fingerprint({
        nodes: {
          'node-a1': { wireguardActive: true, wireguardPeerCount: 0, swarmActive: true, cephMounted: true },
          'node-a2': { wireguardActive: true, wireguardPeerCount: 1, swarmActive: true, cephMounted: true },
        },
      }),
      config,
    );

    expect(drifts.some((drift) => drift.code === 'node.node-a1.wireguard-peer-count')).toBe(true);
  });

  it('reports per-address VIP holder changes', () => {
    const drifts = detectRemoteDrift(
      fingerprint({
        vipHolders: { '203.0.113.100': 'node-a1', '203.0.113.101': 'node-a1' },
      }),
      fingerprint({
        vipHolders: { '203.0.113.100': 'node-a1', '203.0.113.101': 'node-a2' },
      }),
      {
        ...config,
        vip: { address: '203.0.113.100', interface: 'eth0', backend: 'keepalived', pools: [] },
      },
    );

    expect(drifts.some((drift) => drift.code === 'vip.holder.203.0.113.101')).toBe(true);
  });
});
