import { planClusterUpdate } from './cluster-update-planner';
import type { ClusterState } from './cluster-state';

const baseState: ClusterState = {
  version: 1,
  clusterName: 'prod',
  nodes: ['node-a1', 'node-a2'],
  swarmLabels: {
    'node-a1': ['loadweaver.role.manager=true'],
    'node-a2': ['loadweaver.role.worker=true'],
  },
  traefikImage: 'traefik:v3',
  traefikMode: 'global',
  traefikAcmeEnabled: false,
  traefikAcmeChallengeType: null,
  traefikAcmeDnsProvider: null,
  osdDevices: {},
  cephOsdNodes: [],
  nodeHostnames: {
    'node-a1': 'a1',
    'node-a2': 'a2',
  },
  overlayNetworks: ['traefik-public'],
  volumes: ['traefik-config'],
  vipConfigured: false,
  routingEnabled: false,
  routingHubNodes: [],
  routingLocalAsn: null,
  routingClusterCidr: null,
  routingExportWireguardSubnet: true,
  routingPeers: [],
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('planClusterUpdate', () => {
  it('plans peer, swarm, mount, and volume steps for newly added nodes', () => {
    const actions = planClusterUpdate(
      baseState,
      {
        version: 1,
        cluster: { name: 'prod', primaryManager: 'node-a1' },
        nodes: {
          'node-a1': { hostname: 'a1', wireguardIp: '10.200.0.1', roles: ['manager'] },
          'node-a2': { hostname: 'a2', wireguardIp: '10.200.0.2', roles: ['worker'] },
          'node-a3': { hostname: 'a3', wireguardIp: '10.200.0.3', roles: ['worker'] },
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
        volumes: [{ name: 'traefik-config', path: 'traefik/config' }],
      },
      { allowNodeRemoval: false },
    );

    expect(actions.map((action) => action.type)).toEqual([
      'host.bootstrap',
      'wireguard.reconcile',
      'wireguard.add-peer',
      'swarm.join',
      'ceph.mount',
    ]);
  });

  it('plans traefik update when image changes', () => {
    const actions = planClusterUpdate(
      baseState,
      {
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
        swarm: { advertiseInterface: 'wg0', overlayNetworks: ['traefik-public'] },
        ceph: { fsName: 'fs', mountPath: '/mnt/cephfs', replication: 3, release: 'quincy' },
        traefik: { image: 'traefik:v3.1', network: 'traefik-public', mode: 'global' },
        host: { configureFirewall: true },
        volumes: [{ name: 'traefik-config', path: 'traefik/config' }],
      },
      { allowNodeRemoval: false },
    );

    expect(actions).toEqual([{ type: 'traefik.update' }]);
  });

  it('plans swarm.reconcile-labels when node roles change without membership changes', () => {
    const actions = planClusterUpdate(
      baseState,
      {
        version: 1,
        cluster: { name: 'prod', primaryManager: 'node-a1' },
        nodes: {
          'node-a1': { hostname: 'a1', wireguardIp: '10.200.0.1', roles: ['manager'] },
          'node-a2': { hostname: 'a2', wireguardIp: '10.200.0.2', roles: ['manager', 'worker'] },
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
        volumes: [{ name: 'traefik-config', path: 'traefik/config' }],
      },
      { allowNodeRemoval: false },
    );

    expect(actions).toEqual([{ type: 'swarm.reconcile-labels', nodeIds: ['node-a2'] }]);
  });

  it('plans routing init when routing is newly enabled', () => {
    const actions = planClusterUpdate(
      baseState,
      {
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
        swarm: { advertiseInterface: 'wg0', overlayNetworks: ['traefik-public'] },
        ceph: { fsName: 'fs', mountPath: '/mnt/cephfs', replication: 3, release: 'quincy' },
        traefik: { image: 'traefik:v3', network: 'traefik-public', mode: 'global' },
        host: { configureFirewall: true },
        volumes: [{ name: 'traefik-config', path: 'traefik/config' }],
        routing: {
          enabled: true,
          localAsn: 64512,
          exportWireguardSubnet: true,
          peers: [],
          hubNodes: ['node-a1'],
        },
      },
      { allowNodeRemoval: false },
    );

    expect(actions).toEqual([{ type: 'routing.init' }, { type: 'swarm.reconcile-labels', nodeIds: ['node-a1'] }]);
  });

  it('plans ceph osd-add when osdDevice is added to an existing node', () => {
    const actions = planClusterUpdate(
      {
        ...baseState,
        osdDevices: { 'node-a2': '/dev/sdb' },
        swarmLabels: {
          'node-a1': ['loadweaver.role.manager=true'],
          'node-a2': ['loadweaver.role.ceph-osd=true', 'loadweaver.role.worker=true'],
        },
      },
      {
        version: 1,
        cluster: { name: 'prod', primaryManager: 'node-a1' },
        nodes: {
          'node-a1': { hostname: 'a1', wireguardIp: '10.200.0.1', roles: ['manager'] },
          'node-a2': {
            hostname: 'a2',
            wireguardIp: '10.200.0.2',
            roles: ['worker', 'ceph-osd'],
            osdDevice: '/dev/sdc',
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
        host: { configureFirewall: true },
        volumes: [{ name: 'traefik-config', path: 'traefik/config' }],
      },
      { allowNodeRemoval: false },
    );

    expect(actions).toEqual([{ type: 'ceph.osd-add', nodeId: 'node-a2' }]);
  });

  it('plans ceph osd-remove before node leave when osd node is removed', () => {
    const actions = planClusterUpdate(
      {
        ...baseState,
        osdDevices: { 'node-a2': '/dev/sdb' },
        cephOsdNodes: ['node-a2'],
        nodeHostnames: { 'node-a1': 'a1', 'node-a2': 'a2' },
      },
      {
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
        volumes: [{ name: 'traefik-config', path: 'traefik/config' }],
      },
      { allowNodeRemoval: true },
    );

    expect(actions.map((action) => action.type)).toEqual(['ceph.osd-remove', 'node.leave', 'wireguard.remove-peer']);
  });

  it('requires confirmation before removing nodes', () => {
    expect(() =>
      planClusterUpdate(
        baseState,
        {
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
          volumes: [{ name: 'traefik-config', path: 'traefik/config' }],
        },
        { allowNodeRemoval: false },
      ),
    ).toThrow(/--yes/);
  });

  it('plans vip.reconcile when vip fingerprint changes', () => {
    const actions = planClusterUpdate(
      {
        ...baseState,
        vipConfigured: true,
        vipFingerprint: 'previous',
      },
      {
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
        swarm: { advertiseInterface: 'wg0', overlayNetworks: ['traefik-public'] },
        ceph: { fsName: 'fs', mountPath: '/mnt/cephfs', replication: 3, release: 'quincy' },
        traefik: { image: 'traefik:v3', network: 'traefik-public', mode: 'global' },
        host: { configureFirewall: true },
        volumes: [{ name: 'traefik-config', path: 'traefik/config' }],
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
                  backends: [{ type: 'host', host: '10.200.0.50', port: 5432 }],
                },
              ],
            },
          ],
        },
      },
      { allowNodeRemoval: false },
    );

    expect(actions).toEqual([{ type: 'vip.reconcile' }]);
  });
});
