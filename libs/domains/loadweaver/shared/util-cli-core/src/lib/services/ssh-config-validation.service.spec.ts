import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import type { LoadweaverConfig } from '../config/schema';
import { validateSshIdentityFiles, warnUnreachableProxyJumps } from './ssh-config-validation.service';

function baseConfig(overrides: Partial<LoadweaverConfig> = {}): LoadweaverConfig {
  return {
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
    ceph: { fsName: 'fs', mountPath: '/mnt/cephfs', replication: 3, release: 'quincy' },
    traefik: { image: 'traefik:v3', network: 'traefik-public', mode: 'global' },
    volumes: [],
    host: { configureFirewall: true },
    ...overrides,
  };
}

describe('validateSshIdentityFiles', () => {
  it('fails when a configured identity file is missing', () => {
    const checks = validateSshIdentityFiles(
      baseConfig({
        ssh: { identityFile: '/tmp/loadweaver-missing-key-' + Date.now() },
      }),
    );

    expect(checks.some((check) => check.name === 'ssh.identityFile' && !check.passed)).toBe(true);
  });

  it('passes when the identity file exists', () => {
    const keyPath = path.join(os.tmpdir(), `loadweaver-key-${Date.now()}`);
    fs.writeFileSync(keyPath, 'test-key');

    try {
      const checks = validateSshIdentityFiles(baseConfig({ ssh: { identityFile: keyPath } }));
      expect(checks.some((check) => check.name === 'ssh.identityFile' && check.passed)).toBe(true);
    } finally {
      fs.unlinkSync(keyPath);
    }
  });
});

describe('warnUnreachableProxyJumps', () => {
  it('warns when proxy jump probe fails', async () => {
    const warnings: string[] = [];
    const logger = { warn: (message: string) => warnings.push(message) };

    await warnUnreachableProxyJumps(
      baseConfig({ ssh: { proxyJump: 'unreachable.invalid.example' } }),
      {
        run: async () => ({ command: '', stdout: '', stderr: 'timeout', exitCode: 255, dryRun: false }),
        runScript: async () => [],
      },
      logger as never,
      false,
    );

    expect(warnings.some((message) => message.includes('proxy jump'))).toBe(true);
  });
});
