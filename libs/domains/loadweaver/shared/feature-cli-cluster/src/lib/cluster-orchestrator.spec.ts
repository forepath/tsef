import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { ClusterOrchestrator } from './cluster-orchestrator';
import type { ClusterState } from './cluster-state';
import type { LoadweaverContext } from '@forepath/loadweaver/shared/util-cli-core';
import { defaultWorkspaceDir } from '@forepath/loadweaver/shared/util-cli-core';

function createMockContext(includeVip = false, includeRouting = false): LoadweaverContext {
  return {
    options: {
      configPath: './loadweaver.yml',
      dryRun: true,
      verbose: false,
      debug: false,
      yes: false,
      acceptDrift: false,
      local: false,
      json: false,
    },
    config: {
      version: 1,
      cluster: { name: 'test', primaryManager: 'node-a1' },
      nodes: {
        'node-a1': {
          hostname: 'a1.example.com',
          wireguardIp: '10.200.0.1',
          roles: ['manager', 'ceph-mon'],
        },
      },
      wireguard: {
        interface: 'wg0',
        port: 51820,
        mtu: 1420,
        keyRotation: { enabled: false, intervalDays: 90, warnBeforeDays: 14 },
      },
      swarm: { advertiseInterface: 'wg0', overlayNetworks: ['traefik-public'] },
      ceph: { fsName: 'loadweaverfs', mountPath: '/mnt/cephfs', replication: 3, release: 'quincy' },
      traefik: { image: 'traefik:v3', network: 'traefik-public', mode: 'global' },
      volumes: [],
      host: { configureFirewall: true },
      ...(includeVip
        ? {
            vip: {
              address: '10.200.0.100',
              interface: 'wg0',
              backend: 'keepalived' as const,
              routerId: 51,
              pools: [],
            },
          }
        : {}),
      ...(includeRouting
        ? {
            routing: {
              enabled: true,
              localAsn: 64512,
              exportWireguardSubnet: true,
              peers: [],
              hubNodes: ['node-a1'],
            },
          }
        : {}),
    },
    executor: {
      run: async (command: string) => ({ command, stdout: '', stderr: '', exitCode: 0, dryRun: true }),
      runScript: async () => [],
    },
    logger: {
      error: () => undefined,
      warn: () => undefined,
      info: () => undefined,
      debug: () => undefined,
    },
    sshForNode: () => ({
      execRemote: async (command: string) => ({ command, stdout: '', stderr: '', exitCode: 0, dryRun: true }),
      uploadFile: async (command: string) => ({ command, stdout: '', stderr: '', exitCode: 0, dryRun: true }),
    }),
    sshTargetForNode: () => ({ host: '127.0.0.1', user: 'root' }),
  };
}

describe('ClusterOrchestrator', () => {
  it('defines init steps in dependency order without VIP when not configured', () => {
    const steps = new ClusterOrchestrator(createMockContext()).initSteps().map((step) => step.name);

    expect(steps).toEqual([
      'host.bootstrap',
      'prerequisites',
      'wireguard.init',
      'swarm.init',
      'swarm.join',
      'ceph.init',
      'ceph.cephfs-create',
      'ceph.cephfs-mount',
      'volume.create',
      'swarm.network.create',
      'traefik.deploy',
    ]);
  });

  it('appends vip.init when VIP is configured', () => {
    const steps = new ClusterOrchestrator(createMockContext(true)).initSteps().map((step) => step.name);

    expect(steps.at(-1)).toBe('vip.init');
  });

  it('inserts routing.init after wireguard.init when routing is enabled', () => {
    const steps = new ClusterOrchestrator(createMockContext(false, true)).initSteps().map((step) => step.name);

    expect(steps).toContain('routing.init');
    expect(steps.indexOf('routing.init')).toBe(steps.indexOf('wireguard.init') + 1);
  });

  it('defines destroy steps in reverse dependency order without VIP', () => {
    const steps = new ClusterOrchestrator(createMockContext()).destroySteps().map((step) => step.name);

    expect(steps).toEqual(['traefik.destroy', 'swarm.leave', 'ceph.unmount', 'wireguard.teardown']);
  });

  it('inserts vip.destroy after traefik.destroy when VIP is configured', () => {
    const steps = new ClusterOrchestrator(createMockContext(true)).destroySteps().map((step) => step.name);

    expect(steps).toEqual(['traefik.destroy', 'vip.destroy', 'swarm.leave', 'ceph.unmount', 'wireguard.teardown']);
  });

  it('prepends routing.destroy when routing is enabled', () => {
    const steps = new ClusterOrchestrator(createMockContext(false, true)).destroySteps().map((step) => step.name);

    expect(steps[0]).toBe('routing.destroy');
  });

  it('prepends wireguard.rotate-if-due when scheduled rotation is enabled and keys are due', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loadweaver-orchestrator-'));
    const configPath = path.join(tempDir, 'loadweaver.yml');
    fs.writeFileSync(configPath, 'version: 1\n');

    const keysDir = path.join(defaultWorkspaceDir(configPath), 'wireguard');
    fs.mkdirSync(keysDir, { recursive: true });
    fs.writeFileSync(
      path.join(keysDir, 'keys.json'),
      JSON.stringify({
        version: 1,
        nodes: {
          'node-a1': { privateKey: 'priv', publicKey: 'pub' },
        },
      }),
    );

    const ctx = createMockContext();
    ctx.options.configPath = configPath;
    ctx.config!.wireguard.keyRotation = { enabled: true, intervalDays: 90, warnBeforeDays: 14 };

    const previous: ClusterState = {
      version: 1,
      clusterName: 'test',
      nodes: ['node-a1'],
      swarmLabels: {
        'node-a1': ['loadweaver.role.manager=true'],
      },
      traefikImage: 'traefik:v3',
      traefikMode: 'global',
      traefikAcmeEnabled: false,
      traefikAcmeChallengeType: null,
      traefikAcmeDnsProvider: null,
      osdDevices: {},
      cephOsdNodes: [],
      nodeHostnames: { 'node-a1': 'a1' },
      overlayNetworks: ['traefik-public'],
      volumes: [],
      vipConfigured: false,
      routingEnabled: false,
      routingHubNodes: [],
      routingLocalAsn: null,
      routingClusterCidr: null,
      routingExportWireguardSubnet: true,
      routingPeers: [],
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    const steps = new ClusterOrchestrator(ctx).updateSteps(previous).map((step) => step.name);

    expect(steps[0]).toBe('wireguard.rotate-if-due');

    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
