import type { LoadweaverContext } from '@forepath/loadweaver/shared/util-cli-core';

import { TraefikService } from './traefik.service';

function createContext(acmeEnabled: boolean): LoadweaverContext {
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
      },
      wireguard: {
        interface: 'wg0',
        port: 51820,
        mtu: 1420,
        keyRotation: { enabled: false, intervalDays: 90, warnBeforeDays: 14 },
      },
      swarm: { advertiseInterface: 'wg0', overlayNetworks: ['traefik-public'] },
      ceph: { fsName: 'fs', mountPath: '/mnt/cephfs', replication: 3, release: 'quincy' },
      traefik: {
        image: 'traefik:v3',
        network: 'traefik-public',
        mode: 'global',
        ...(acmeEnabled
          ? {
              acme: {
                email: 'admin@example.com',
                challengeType: 'http' as const,
                envFile: '/etc/loadweaver/traefik-acme.env',
                storagePath: '/letsencrypt/acme.json',
              },
            }
          : {}),
      },
      volumes: [],
      host: { configureFirewall: true },
    },
    executor: {
      run: async () => ({ command: '', stdout: '', stderr: '', exitCode: 0, dryRun: true }),
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

describe('TraefikService', () => {
  it('uses single-leader placement when ACME is enabled', async () => {
    const commands: string[] = [];
    const ctx = createContext(true);
    ctx.sshForNode = () => ({
      execRemote: async (command: string) => {
        commands.push(command);
        return { command, stdout: '', stderr: '', exitCode: 0, dryRun: true };
      },
      uploadFile: async (command: string) => ({ command, stdout: '', stderr: '', exitCode: 0, dryRun: true }),
    });

    await new TraefikService(ctx).deploy();

    expect(commands.some((command) => command.includes('loadweaver.acme-leader=true'))).toBe(true);
    expect(commands.some((command) => command.includes('mode: replicated'))).toBe(true);
    expect(commands.some((command) => command.includes('replicas: 1'))).toBe(true);
  });

  it('uses DNS challenge args when ACME dns mode is configured', async () => {
    const commands: string[] = [];
    const ctx = createContext(false);
    ctx.config!.traefik.acme = {
      email: 'admin@example.com',
      challengeType: 'dns',
      dnsProvider: 'cloudflare',
      envFile: '/etc/loadweaver/traefik-acme.env',
      storagePath: '/letsencrypt/acme.json',
    };
    ctx.sshForNode = () => ({
      execRemote: async (command: string) => {
        commands.push(command);
        return { command, stdout: '1/1', stderr: '', exitCode: 0, dryRun: true };
      },
      uploadFile: async (command: string) => ({ command, stdout: '', stderr: '', exitCode: 0, dryRun: true }),
    });

    await new TraefikService(ctx).deploy();

    const stackCommand = commands.find((command) => command.includes('traefik-stack.yml'));

    expect(stackCommand).toContain('--certificatesresolvers.le.acme.dnschallenge=true');
    expect(stackCommand).toContain('--certificatesresolvers.le.acme.dnschallenge.provider=cloudflare');
    expect(stackCommand).toContain('CF_DNS_API_TOKEN');
  });
});
