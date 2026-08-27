import { buildHelloMessage } from './hello.command';
import type { LoadweaverContext } from '@forepath/loadweaver/shared/util-cli-core';

function createContext(configLoaded: boolean): LoadweaverContext {
  return {
    options: {
      configPath: './loadweaver.yml',
      dryRun: false,
      verbose: false,
      debug: false,
      yes: false,
      acceptDrift: false,
      local: false,
      json: false,
    },
    config: configLoaded
      ? {
          version: 1,
          cluster: { name: 'loadweaver-prod', primaryManager: 'node-a1' },
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
          volumes: [],
        }
      : undefined,
    executor: {
      run: async () => ({ command: '', stdout: '', stderr: '', exitCode: 0, dryRun: false }),
      runScript: async () => [],
    },
    logger: {
      error: () => undefined,
      warn: () => undefined,
      info: () => undefined,
      debug: () => undefined,
    },
    sshForNode: () => ({
      execRemote: async (command: string) => ({ command, stdout: '', stderr: '', exitCode: 0, dryRun: false }),
      uploadFile: async (command: string) => ({ command, stdout: '', stderr: '', exitCode: 0, dryRun: false }),
    }),
    sshTargetForNode: () => ({ host: '127.0.0.1', user: 'root' }),
  };
}

describe('buildHelloMessage', () => {
  it('includes a product greeting and config path without requiring verbose logging', () => {
    const message = buildHelloMessage(createContext(true));

    expect(message).toContain('Loadweaver');
    expect(message).toContain('Config: ./loadweaver.yml');
    expect(message).toContain('Cluster: loadweaver-prod (2 node(s) in config)');
  });

  it('explains when no config is loaded', () => {
    const message = buildHelloMessage(createContext(false));

    expect(message).toContain('no config loaded yet');
  });
});
