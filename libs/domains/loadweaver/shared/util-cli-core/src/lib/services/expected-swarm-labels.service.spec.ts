import {
  deriveExpectedSwarmLabels,
  diffSwarmLabelChanges,
  missingExpectedSwarmLabels,
  roleSwarmLabel,
  routerSwarmLabel,
  siteSwarmLabel,
  staleManagedSwarmLabelKeys,
} from './expected-swarm-labels.service';
import type { LoadweaverConfig } from '../config/schema';

const config: LoadweaverConfig = {
  version: 1,
  cluster: { name: 'test', primaryManager: 'node-a1' },
  sites: [{ name: 'site-a', nodes: ['node-a1', 'node-a2'] }],
  nodes: {
    'node-a1': { hostname: 'a1', wireguardIp: '10.200.0.1', roles: ['manager'] },
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

describe('expected swarm labels', () => {
  it('derives role and site labels using per-role keys', () => {
    expect(deriveExpectedSwarmLabels(config)).toEqual({
      'node-a1': [roleSwarmLabel('manager'), siteSwarmLabel('site-a')],
      'node-a2': [roleSwarmLabel('ceph-osd'), roleSwarmLabel('worker'), siteSwarmLabel('site-a')],
    });
  });

  it('reports missing expected labels', () => {
    const missing = missingExpectedSwarmLabels(deriveExpectedSwarmLabels(config), {
      'node-a1': [roleSwarmLabel('manager')],
      'node-a2': [roleSwarmLabel('worker'), siteSwarmLabel('site-a'), roleSwarmLabel('ceph-osd')],
    });

    expect(missing).toEqual([{ nodeId: 'node-a1', missing: [siteSwarmLabel('site-a')] }]);
  });

  it('adds router label for routing hub nodes', () => {
    const routingConfig: LoadweaverConfig = {
      ...config,
      routing: {
        enabled: true,
        localAsn: 64512,
        exportWireguardSubnet: true,
        peers: [],
        hubNodes: ['node-a1'],
      },
    };

    expect(deriveExpectedSwarmLabels(routingConfig)['node-a1']).toContain(routerSwarmLabel());
    expect(deriveExpectedSwarmLabels(routingConfig)['node-a2']).not.toContain(routerSwarmLabel());
  });

  it('detects label-only config changes for existing nodes', () => {
    const changed = diffSwarmLabelChanges(deriveExpectedSwarmLabels(config), {
      ...config,
      nodes: {
        ...config.nodes,
        'node-a2': { ...config.nodes['node-a2'], roles: ['worker', 'ceph-osd', 'manager'] },
      },
    });

    expect(changed).toEqual(['node-a2']);
  });

  it('identifies stale managed labels including legacy single-key labels', () => {
    expect(
      staleManagedSwarmLabelKeys(
        [roleSwarmLabel('worker'), siteSwarmLabel('site-a')],
        [
          roleSwarmLabel('worker'),
          roleSwarmLabel('ceph-osd'),
          siteSwarmLabel('site-b'),
          'loadweaver.role=worker',
          'loadweaver.site=site-a',
          'custom.label=keep',
        ],
      ),
    ).toEqual(['loadweaver.role.ceph-osd', 'loadweaver.site.site-b', 'loadweaver.role', 'loadweaver.site']);
  });
});
