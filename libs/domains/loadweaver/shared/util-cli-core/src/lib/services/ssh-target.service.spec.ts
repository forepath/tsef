import type { LoadweaverConfig } from '../config/schema';
import { resolveSshTarget } from './ssh-target.service';

function baseConfig(overrides: Partial<LoadweaverConfig> = {}): LoadweaverConfig {
  return {
    version: 1,
    cluster: { name: 'test', primaryManager: 'node-a1' },
    nodes: {
      'node-a1': {
        hostname: 'a1.example.com',
        publicIp: '203.0.113.1',
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
    swarm: { advertiseInterface: 'wg0', overlayNetworks: ['traefik-public'] },
    ceph: { fsName: 'fs', mountPath: '/mnt/cephfs', replication: 3, release: 'quincy' },
    traefik: { image: 'traefik:v3', network: 'traefik-public', mode: 'global' },
    volumes: [],
    host: { configureFirewall: true },
    ...overrides,
  };
}

describe('resolveSshTarget', () => {
  it('uses global ssh defaults when node overrides are absent', () => {
    const config = baseConfig({
      ssh: {
        user: 'admin',
        port: 2222,
        identityFile: '~/.ssh/global',
        proxyJump: 'bastion.example.com',
      },
    });

    expect(resolveSshTarget(config, 'node-a1')).toEqual({
      host: '203.0.113.1',
      user: 'admin',
      port: 2222,
      identityFile: '~/.ssh/global',
      proxyJump: 'bastion.example.com',
      connectTimeoutSeconds: 10,
      serverAliveIntervalSeconds: 15,
    });
  });

  it('prefers per-node ssh settings over global defaults', () => {
    const config = baseConfig({
      ssh: { user: 'admin', identityFile: '~/.ssh/global' },
      nodes: {
        'node-a1': {
          hostname: 'a1.example.com',
          publicIp: '203.0.113.1',
          wireguardIp: '10.200.0.1',
          roles: ['manager'],
          sshUser: 'deploy',
          sshPort: 2200,
          identityFile: '~/.ssh/node-a1',
          proxyJump: 'jump-a.example.com',
        },
      },
    });

    expect(resolveSshTarget(config, 'node-a1')).toEqual({
      host: '203.0.113.1',
      user: 'deploy',
      port: 2200,
      identityFile: '~/.ssh/node-a1',
      proxyJump: 'jump-a.example.com',
      connectTimeoutSeconds: 10,
      serverAliveIntervalSeconds: 15,
    });
  });

  it('uses configured ssh timeout overrides', () => {
    const config = baseConfig({
      ssh: {
        connectTimeoutSeconds: 30,
        serverAliveIntervalSeconds: 0,
      },
    });

    expect(resolveSshTarget(config, 'node-a1')).toEqual({
      host: '203.0.113.1',
      user: 'root',
      connectTimeoutSeconds: 30,
      serverAliveIntervalSeconds: 0,
    });
  });

  it('throws for unknown nodes', () => {
    expect(() => resolveSshTarget(baseConfig(), 'missing')).toThrow('Unknown node');
  });
});
