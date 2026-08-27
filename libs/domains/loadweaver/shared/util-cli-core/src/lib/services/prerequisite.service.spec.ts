import type { LoadweaverContext } from '../context';
import { assertPrerequisites, runPrerequisiteChecks } from './prerequisite.service';

function createContext(overrides: Partial<NonNullable<LoadweaverContext['config']>> = {}): LoadweaverContext {
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
          roles: ['manager'],
        },
      },
      wireguard: {
        interface: 'wg0',
        port: 51820,
        mtu: 1420,
        keyRotation: { enabled: false, intervalDays: 90, warnBeforeDays: 14 },
      },
      swarm: { advertiseInterface: 'wg0', overlayNetworks: [] },
      ceph: { fsName: 'loadweaverfs', mountPath: '/mnt/cephfs', replication: 3, release: 'quincy' },
      traefik: { image: 'traefik:v3', network: 'traefik-public', mode: 'global' },
      volumes: [],
      host: { configureFirewall: true },
      ...overrides,
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
      execRemote: async () => ({ command: '', stdout: '', stderr: '', exitCode: 0, dryRun: true }),
      uploadFile: async () => ({ command: '', stdout: '', stderr: '', exitCode: 0, dryRun: true }),
    }),
    sshTargetForNode: () => ({ host: '127.0.0.1', user: 'root' }),
  };
}

describe('runPrerequisiteChecks', () => {
  it('reports missing configuration', async () => {
    const checks = await runPrerequisiteChecks({ ...createContext(), config: undefined });

    expect(checks).toEqual([{ name: 'config', passed: false, message: 'Configuration not loaded' }]);
  });

  it('passes when managers and wireguard IPs are valid', async () => {
    const checks = await runPrerequisiteChecks(createContext());

    expect(checks.filter((check) => !check.passed)).toHaveLength(0);
    expect(checks.some((check) => check.name === 'managers' && check.passed)).toBe(true);
  });

  it('fails when primary manager lacks manager role', async () => {
    const checks = await runPrerequisiteChecks(
      createContext({
        nodes: {
          'node-a1': {
            hostname: 'a1.example.com',
            wireguardIp: '10.200.0.1',
            roles: ['worker'],
          },
        },
      }),
    );

    expect(checks.some((check) => check.name === 'primary-manager' && !check.passed)).toBe(true);
  });
});

describe('assertPrerequisites', () => {
  it('throws when any check failed', () => {
    expect(() => assertPrerequisites([{ name: 'config', passed: false, message: 'Configuration not loaded' }])).toThrow(
      /Prerequisite checks failed/,
    );
  });
});
