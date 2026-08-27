import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import type { LoadweaverContext } from '../context';
import { acquireClusterLock, createLockRecord, readClusterLock, releaseClusterLock } from './cluster-lock';
import { confirmProceedAfterDrift, type DriftFinding } from './confirm-drift';
import { runGuardedMutation } from './mutation-guard';
import { clusterLockPath, defaultWorkspaceDir } from './paths';

function createContext(
  configPath: string,
  overrides?: Partial<LoadweaverContext['options']> & {
    inspectDrift?: () => Promise<DriftFinding[]>;
    persistInventory?: (operation: string) => Promise<void>;
    refreshInventoryFromLive?: () => Promise<void>;
    acquireHostLocks?: (operation: string) => Promise<string[]>;
    releaseHostLocks?: (nodeIds: string[]) => Promise<void>;
  },
): LoadweaverContext {
  const {
    inspectDrift,
    persistInventory,
    refreshInventoryFromLive,
    acquireHostLocks,
    releaseHostLocks,
    ...optionOverrides
  } = overrides ?? {};

  return {
    options: {
      configPath,
      dryRun: false,
      verbose: false,
      debug: false,
      yes: false,
      acceptDrift: false,
      local: false,
      json: false,
      ...optionOverrides,
    },
    logger: {
      error: () => undefined,
      warn: () => undefined,
      info: () => undefined,
      debug: () => undefined,
    },
    executor: {
      run: async (command: string) => ({ command, stdout: '', stderr: '', exitCode: 0, dryRun: false }),
      runScript: async () => [],
    },
    inspectDrift,
    persistInventory,
    refreshInventoryFromLive,
    acquireHostLocks,
    releaseHostLocks,
    sshForNode: () => ({
      execRemote: async (command: string) => ({ command, stdout: '', stderr: '', exitCode: 0, dryRun: false }),
      uploadFile: async (command: string) => ({ command, stdout: '', stderr: '', exitCode: 0, dryRun: false }),
    }),
    sshTargetForNode: () => ({ host: '127.0.0.1', user: 'root' }),
  };
}

describe('confirmProceedAfterDrift', () => {
  const drift: DriftFinding[] = [{ code: 'swarm.membership', message: 'Node count changed' }];

  it('skips confirmation when no drift is present', async () => {
    await expect(
      confirmProceedAfterDrift([], { yes: false, acceptDrift: false, dryRun: false, operation: 'test' }),
    ).resolves.toBe('none');
  });

  it('skips confirmation in dry-run mode', async () => {
    await expect(
      confirmProceedAfterDrift(drift, { yes: false, acceptDrift: false, dryRun: true, operation: 'test' }),
    ).resolves.toBe('none');
  });

  it('proceeds without a prompt when --yes is set', async () => {
    await expect(
      confirmProceedAfterDrift(drift, { yes: true, acceptDrift: false, dryRun: false, operation: 'test' }),
    ).resolves.toBe('proceed');
  });

  it('skips drift and refreshes inventory when --accept-drift is set', async () => {
    await expect(
      confirmProceedAfterDrift(drift, { yes: false, acceptDrift: true, dryRun: false, operation: 'test' }),
    ).resolves.toBe('skip');
  });

  it('rejects non-interactive drift without --yes', async () => {
    const originalIsTTY = process.stdin.isTTY;
    Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: false });

    await expect(
      confirmProceedAfterDrift(drift, { yes: false, acceptDrift: false, dryRun: false, operation: 'wireguard.init' }),
    ).rejects.toThrow('--yes');

    Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: originalIsTTY });
  });
});

describe('runGuardedMutation integration', () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loadweaver-guard-'));
    configPath = path.join(tempDir, 'loadweaver.yml');
    fs.writeFileSync(configPath, 'version: 1\n');
  });

  afterEach(() => {
    releaseClusterLock(configPath);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('acquires and releases a workspace lock around mutations', async () => {
    const ctx = createContext(configPath);
    const lockPath = clusterLockPath(configPath);

    await runGuardedMutation(ctx, 'wireguard.init', async () => {
      expect(readClusterLock(lockPath)?.operation).toBe('wireguard.init');
    });

    expect(readClusterLock(lockPath)).toBeUndefined();
  });

  it('does not acquire a lock in dry-run mode', async () => {
    const ctx = createContext(configPath, { dryRun: true });
    const lockPath = clusterLockPath(configPath);

    await runGuardedMutation(ctx, 'wireguard.init', async () => undefined);

    expect(fs.existsSync(lockPath)).toBe(false);
  });

  it('releases the lock when the mutation throws', async () => {
    const ctx = createContext(configPath);
    const lockPath = clusterLockPath(configPath);

    await expect(
      runGuardedMutation(ctx, 'cluster.update', async () => {
        throw new Error('mutation failed');
      }),
    ).rejects.toThrow('mutation failed');

    expect(readClusterLock(lockPath)).toBeUndefined();
  });

  it('blocks concurrent mutations while a live lock is held', async () => {
    acquireClusterLock(configPath, 'cluster.init');
    const ctx = createContext(configPath);

    await expect(runGuardedMutation(ctx, 'wireguard.init', async () => undefined)).rejects.toThrow(/lock held/i);
  });

  it('replaces stale locks from dead processes', async () => {
    const lockPath = clusterLockPath(configPath);
    fs.mkdirSync(defaultWorkspaceDir(configPath), { recursive: true });
    const stale = createLockRecord('cluster.init', configPath);
    stale.pid = 999_999;
    fs.writeFileSync(lockPath, `${JSON.stringify(stale, null, 2)}\n`);

    const ctx = createContext(configPath);

    await runGuardedMutation(ctx, 'wireguard.rotate-if-due', async () => undefined);

    expect(readClusterLock(lockPath)).toBeUndefined();
  });

  it('warns about drift findings and proceeds with --yes', async () => {
    const warnings: string[] = [];
    const ctx = createContext(configPath, {
      yes: true,
      inspectDrift: async () => [{ code: 'traefik.revision', message: 'Revision changed' }],
    });
    ctx.logger.warn = (message: string) => warnings.push(message);

    await runGuardedMutation(ctx, 'traefik.update', async () => undefined);

    expect(warnings.some((message) => message.includes('remote drift finding'))).toBe(true);
  });

  it('calls inspectDrift before executing the mutation', async () => {
    const order: string[] = [];
    const ctx = createContext(configPath, {
      yes: true,
      inspectDrift: async () => {
        order.push('inspect');
        return [];
      },
    });

    await runGuardedMutation(ctx, 'swarm.join', async () => {
      order.push('run');
    });

    expect(order).toEqual(['inspect', 'run']);
  });

  it('rejects drift in non-interactive sessions without --yes', async () => {
    const originalIsTTY = process.stdin.isTTY;
    Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: false });

    const ctx = createContext(configPath, {
      inspectDrift: async () => [{ code: 'swarm.labels', message: 'Missing label' }],
    });

    await expect(runGuardedMutation(ctx, 'node.join', async () => undefined)).rejects.toThrow('--yes');

    Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: originalIsTTY });
    expect(readClusterLock(clusterLockPath(configPath))).toBeUndefined();
  });

  it('does not refresh inventory when proceeding with --yes', async () => {
    const order: string[] = [];
    const ctx = createContext(configPath, {
      yes: true,
      inspectDrift: async () => [{ code: 'traefik.revision', message: 'Revision changed' }],
      refreshInventoryFromLive: async () => {
        order.push('refresh');
      },
      persistInventory: async () => {
        order.push('persist');
      },
    });

    await runGuardedMutation(ctx, 'traefik.update', async () => {
      order.push('run');
    });

    expect(order).toEqual(['run', 'persist']);
  });

  it('refreshes inventory from live before running when --accept-drift is set', async () => {
    const order: string[] = [];
    const ctx = createContext(configPath, {
      acceptDrift: true,
      inspectDrift: async () => [{ code: 'inventory.serial.node-a1', message: 'Serial mismatch' }],
      refreshInventoryFromLive: async () => {
        order.push('refresh');
      },
      persistInventory: async () => {
        order.push('persist');
      },
    });

    await runGuardedMutation(ctx, 'cluster.update', async () => {
      order.push('run');
    });

    expect(order).toEqual(['refresh', 'run', 'persist']);
  });

  it('does not persist inventory when the mutation throws', async () => {
    let persisted = false;
    const ctx = createContext(configPath, {
      persistInventory: async () => {
        persisted = true;
      },
    });

    await expect(
      runGuardedMutation(ctx, 'cluster.update', async () => {
        throw new Error('mutation failed');
      }),
    ).rejects.toThrow('mutation failed');

    expect(persisted).toBe(false);
  });
});
