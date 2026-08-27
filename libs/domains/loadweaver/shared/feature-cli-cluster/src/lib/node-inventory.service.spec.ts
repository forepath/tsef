import type { LoadweaverConfig } from '@forepath/loadweaver/shared/util-cli-core';

import type { ClusterState } from './cluster-state';
import { buildNodeInventory, detectInventoryDrift, type NodeInventoryRecord } from './node-inventory.service';
import type { RemoteFingerprint } from './remote-fingerprint';

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
};

const fingerprint: RemoteFingerprint = {
  capturedAt: '2026-01-01T00:00:00.000Z',
  swarmNodeHostnames: ['a1'],
  swarmNodeLabels: {},
  traefikImage: null,
  traefikDeployed: false,
  traefikServiceVersion: null,
  traefikReplicas: null,
  vipKeepalivedActive: false,
  vipHolderNodeId: null,
  vipHolders: {},
  cephHealth: null,
  cephMonitorCount: 0,
  nodes: {
    'node-a1': { wireguardActive: true, wireguardPeerCount: 0, swarmActive: true, cephMounted: true },
  },
};

function inventory(overrides: Partial<NodeInventoryRecord> = {}): NodeInventoryRecord {
  return {
    inventorySerial: 3,
    clusterName: 'prod',
    nodeId: 'node-a1',
    updatedAt: '2026-01-01T00:00:00.000Z',
    lastOperation: 'cluster.update',
    node: { hostname: 'a1', roles: ['manager'], wireguardIp: '10.200.0.1' },
    fingerprint: { wireguardActive: true, wireguardPeerCount: 0, swarmActive: true, cephMounted: true },
    ...overrides,
  };
}

describe('detectInventoryDrift', () => {
  const stored: ClusterState = {
    version: 1,
    clusterName: 'prod',
    nodes: ['node-a1'],
    swarmLabels: {},
    traefikImage: 'traefik:v3',
    traefikMode: 'global',
    traefikAcmeEnabled: false,
    traefikAcmeChallengeType: null,
    traefikAcmeDnsProvider: null,
    osdDevices: {},
    cephOsdNodes: [],
    overlayNetworks: ['traefik-public'],
    volumes: [],
    vipConfigured: false,
    routingEnabled: false,
    routingHubNodes: [],
    routingLocalAsn: null,
    routingClusterCidr: null,
    routingExportWireguardSubnet: true,
    routingPeers: [],
    nodeHostnames: { 'node-a1': 'a1' },
    updatedAt: '2026-01-01T00:00:00.000Z',
    inventorySerial: 3,
    desired: config,
    remoteFingerprint: fingerprint,
  };

  it('reports missing host inventory files', () => {
    const drifts = detectInventoryDrift(stored, { 'node-a1': null }, fingerprint, ['node-a1']);

    expect(drifts.some((drift) => drift.code === 'inventory.missing.node-a1')).toBe(true);
  });

  it('reports serial mismatches against local inventory', () => {
    const drifts = detectInventoryDrift(stored, { 'node-a1': inventory({ inventorySerial: 1 }) }, fingerprint, [
      'node-a1',
    ]);

    expect(drifts.some((drift) => drift.code === 'inventory.serial.node-a1')).toBe(true);
  });

  it('reports live probe mismatches against host inventory', () => {
    const live: RemoteFingerprint = {
      ...fingerprint,
      nodes: {
        'node-a1': { wireguardActive: false, wireguardPeerCount: 0, swarmActive: true, cephMounted: true },
      },
    };
    const drifts = detectInventoryDrift(stored, { 'node-a1': inventory() }, live, ['node-a1']);

    expect(drifts.some((drift) => drift.code === 'inventory.live.node-a1.wireguard')).toBe(true);
  });
});

describe('buildNodeInventory', () => {
  it('builds a per-node inventory record from cluster state', () => {
    const state: ClusterState = {
      version: 1,
      clusterName: 'prod',
      nodes: ['node-a1'],
      swarmLabels: {},
      traefikImage: 'traefik:v3',
      traefikMode: 'global',
      traefikAcmeEnabled: false,
      traefikAcmeChallengeType: null,
      traefikAcmeDnsProvider: null,
      osdDevices: {},
      cephOsdNodes: [],
      overlayNetworks: ['traefik-public'],
      volumes: [],
      vipConfigured: false,
      routingEnabled: false,
      routingHubNodes: [],
      routingLocalAsn: null,
      routingClusterCidr: null,
      routingExportWireguardSubnet: true,
      routingPeers: [],
      nodeHostnames: { 'node-a1': 'a1' },
      updatedAt: '2026-01-02T00:00:00.000Z',
      inventorySerial: 4,
      desired: config,
      remoteFingerprint: fingerprint,
    };

    expect(buildNodeInventory(state, 'node-a1', 'wireguard.init')).toEqual({
      inventorySerial: 4,
      clusterName: 'prod',
      nodeId: 'node-a1',
      updatedAt: '2026-01-02T00:00:00.000Z',
      lastOperation: 'wireguard.init',
      node: { hostname: 'a1', roles: ['manager'], wireguardIp: '10.200.0.1' },
      fingerprint: fingerprint.nodes['node-a1'],
    });
  });
});
