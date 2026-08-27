import type { LoadweaverConfig } from '@forepath/loadweaver/shared/util-cli-core';

import { evaluateKeyRotation, resolveKeyRotationPolicy, resolveRotationStatusExitCode } from './wireguard-key-rotation';
import type { WireguardKeyStore } from './wireguard-key-store';

function createConfig(overrides?: Partial<LoadweaverConfig['wireguard']['keyRotation']>): LoadweaverConfig {
  return {
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
      keyRotation: {
        enabled: true,
        intervalDays: 90,
        warnBeforeDays: 14,
        ...overrides,
      },
    },
    swarm: { advertiseInterface: 'wg0', overlayNetworks: ['traefik-public'] },
    ceph: { fsName: 'fs', mountPath: '/mnt/cephfs', replication: 3, release: 'quincy' },
    traefik: { image: 'traefik:v3', network: 'traefik-public', mode: 'global' },
    volumes: [],
    host: { configureFirewall: true },
  };
}

function createStore(rotatedAtByNode: Record<string, string | undefined>): WireguardKeyStore {
  return {
    version: 1,
    nodes: Object.fromEntries(
      Object.entries(rotatedAtByNode).map(([nodeId, rotatedAt]) => [
        nodeId,
        { privateKey: `${nodeId}-priv`, publicKey: `${nodeId}-pub`, rotatedAt },
      ]),
    ),
  };
}

describe('wireguard key rotation', () => {
  it('resolves rotation policy from config', () => {
    const policy = resolveKeyRotationPolicy(createConfig({ intervalDays: 30, warnBeforeDays: 7 }));

    expect(policy).toEqual({
      enabled: true,
      intervalDays: 30,
      warnBeforeDays: 7,
    });
  });

  it('marks keys without rotatedAt as due when rotation is enabled', () => {
    const evaluation = evaluateKeyRotation(createConfig(), { version: 1, nodes: {} });

    expect(evaluation.dueNodeIds).toEqual(['node-a1', 'node-a2']);
  });

  it('marks keys as warning when they are within the warning window', () => {
    const referenceDate = new Date('2026-06-01T00:00:00.000Z');
    const rotatedAt = new Date(referenceDate.getTime() - 80 * 24 * 60 * 60 * 1000).toISOString();
    const store = createStore({ 'node-a1': rotatedAt, 'node-a2': rotatedAt });
    const evaluation = evaluateKeyRotation(createConfig(), store, referenceDate);

    expect(evaluation.warningNodeIds).toEqual(['node-a1', 'node-a2']);
    expect(evaluation.dueNodeIds).toEqual([]);
  });

  it('marks keys as due when they exceed intervalDays', () => {
    const referenceDate = new Date('2026-06-01T00:00:00.000Z');
    const rotatedAt = new Date(referenceDate.getTime() - 91 * 24 * 60 * 60 * 1000).toISOString();
    const store = createStore({ 'node-a1': rotatedAt, 'node-a2': rotatedAt });
    const evaluation = evaluateKeyRotation(createConfig(), store, referenceDate);

    expect(evaluation.dueNodeIds).toEqual(['node-a1', 'node-a2']);
  });

  it('reports ok when rotation is disabled regardless of key age', () => {
    const referenceDate = new Date('2026-06-01T00:00:00.000Z');
    const rotatedAt = new Date(referenceDate.getTime() - 200 * 24 * 60 * 60 * 1000).toISOString();
    const store = createStore({ 'node-a1': rotatedAt, 'node-a2': rotatedAt });
    const evaluation = evaluateKeyRotation(createConfig({ enabled: false }), store, referenceDate);

    expect(evaluation.dueNodeIds).toEqual([]);
    expect(evaluation.nodes.every((node) => node.status === 'ok')).toBe(true);
  });
});

describe('resolveRotationStatusExitCode', () => {
  it('returns 1 when keys are due', () => {
    const evaluation = evaluateKeyRotation(createConfig(), { version: 1, nodes: {} });
    expect(resolveRotationStatusExitCode(evaluation)).toBe(1);
  });

  it('returns 2 when keys are in the warning window only', () => {
    const referenceDate = new Date('2026-06-01T00:00:00.000Z');
    const rotatedAt = new Date(referenceDate.getTime() - 80 * 24 * 60 * 60 * 1000).toISOString();
    const store = createStore({ 'node-a1': rotatedAt, 'node-a2': rotatedAt });
    const evaluation = evaluateKeyRotation(createConfig(), store, referenceDate);

    expect(resolveRotationStatusExitCode(evaluation)).toBe(2);
  });

  it('returns 0 when rotation is disabled', () => {
    const evaluation = evaluateKeyRotation(createConfig({ enabled: false }), { version: 1, nodes: {} });
    expect(resolveRotationStatusExitCode(evaluation)).toBe(0);
  });
});
