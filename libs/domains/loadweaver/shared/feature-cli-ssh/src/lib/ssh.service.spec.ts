import type { LoadweaverContext } from '@forepath/loadweaver/shared/util-cli-core';

import { SshService } from './ssh.service';

function createContext(overrides: Partial<LoadweaverContext> = {}): LoadweaverContext {
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
    config: {
      version: 1,
      cluster: { name: 'loadweaver-prod', primaryManager: 'node-a1' },
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
    },
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
      execRemote: async (command: string) => ({
        command,
        stdout: 'listed\n',
        stderr: '',
        exitCode: 0,
        dryRun: false,
      }),
      uploadFile: async () => ({ command: '', stdout: '', stderr: '', exitCode: 0, dryRun: false }),
    }),
    sshTargetForNode: () => ({ host: '127.0.0.1', user: 'root' }),
    ...overrides,
  };
}

describe('SshService', () => {
  it('executes a remote command on a configured node', async () => {
    let capturedCommand = '';

    const ctx = createContext({
      sshForNode: () => ({
        execRemote: async (command: string) => {
          capturedCommand = command;
          return { command, stdout: '', stderr: '', exitCode: 0, dryRun: false };
        },
        uploadFile: async () => ({ command: '', stdout: '', stderr: '', exitCode: 0, dryRun: false }),
      }),
    });

    const exitCode = await new SshService(ctx).exec('node-a1', ['docker', 'ps']);

    expect(exitCode).toBe(0);
    expect(capturedCommand).toBe('docker ps');
  });

  it('rejects unknown nodes', async () => {
    await expect(new SshService(createContext()).exec('missing', ['ls'])).rejects.toThrow('Unknown node: missing');
  });

  it('requires a remote command', async () => {
    await expect(new SshService(createContext()).exec('node-a1', [])).rejects.toThrow('Remote command required');
  });
});
