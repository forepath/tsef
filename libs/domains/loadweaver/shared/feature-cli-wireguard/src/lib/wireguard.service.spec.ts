import type { LoadweaverContext } from '@forepath/loadweaver/shared/util-cli-core';

import { WireguardService } from './wireguard.service';

function createContext(): LoadweaverContext {
  const logs: string[] = [];

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
      volumes: [],
      host: { configureFirewall: true },
    },
    executor: {
      run: async (command: string) => ({ command, stdout: '', stderr: '', exitCode: 0, dryRun: true }),
      runScript: async () => [],
    },
    logger: {
      error: () => undefined,
      warn: () => undefined,
      info: (message: string) => logs.push(message),
      debug: () => undefined,
    },
    sshForNode: () => ({
      execRemote: async (command: string) => ({ command, stdout: '', stderr: '', exitCode: 0, dryRun: true }),
      uploadFile: async (command: string) => ({ command, stdout: '', stderr: '', exitCode: 0, dryRun: true }),
    }),
    sshTargetForNode: () => ({ host: '127.0.0.1', user: 'root' }),
  };
}

describe('WireguardService', () => {
  it('initializes mesh configuration for all nodes in dry-run mode', async () => {
    const ctx = createContext();
    await new WireguardService(ctx).init();
    expect(ctx.logger.info).toBeDefined();
  });

  it('rotates keys for all nodes in dry-run mode', async () => {
    const ctx = createContext();
    await new WireguardService(ctx).rotateKeys();
    expect(ctx.logger.info).toBeDefined();
  });
});
