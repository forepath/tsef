import * as fs from 'node:fs';
import * as os from 'node:os';

import { defaultWorkspaceDir } from './paths';

export interface ClusterLockRecord {
  pid: number;
  hostname: string;
  operation: string;
  startedAt: string;
  configPath: string;
}

const DEFAULT_STALE_MS = 2 * 60 * 60 * 1000;

export function createLockRecord(operation: string, configPath: string): ClusterLockRecord {
  return {
    pid: process.pid,
    hostname: os.hostname(),
    operation,
    startedAt: new Date().toISOString(),
    configPath,
  };
}

export function readClusterLock(lockPath: string): ClusterLockRecord | undefined {
  if (!fs.existsSync(lockPath)) {
    return undefined;
  }

  return JSON.parse(fs.readFileSync(lockPath, 'utf-8')) as ClusterLockRecord;
}

export function isClusterLockStale(lock: ClusterLockRecord, staleAfterMs = DEFAULT_STALE_MS): boolean {
  const startedAt = Date.parse(lock.startedAt);

  if (Number.isNaN(startedAt)) {
    return true;
  }

  if (Date.now() - startedAt > staleAfterMs) {
    return true;
  }

  if (lock.pid === process.pid) {
    return false;
  }

  try {
    process.kill(lock.pid, 0);
    return false;
  } catch {
    return true;
  }
}

export function acquireClusterLock(configPath: string, operation: string): ClusterLockRecord {
  const workspaceDir = defaultWorkspaceDir(configPath);
  const lockPath = `${workspaceDir}/lock.json`;
  fs.mkdirSync(workspaceDir, { recursive: true });

  const existing = readClusterLock(lockPath);

  if (existing && !isClusterLockStale(existing)) {
    throw new Error(
      `Loadweaver lock held by ${existing.operation} (pid ${existing.pid} on ${existing.hostname}, started ${existing.startedAt})`,
    );
  }

  if (existing) {
    fs.unlinkSync(lockPath);
  }

  const record = createLockRecord(operation, configPath);

  try {
    fs.writeFileSync(lockPath, `${JSON.stringify(record, null, 2)}\n`, { flag: 'wx' });
  } catch {
    throw new Error('Failed to acquire loadweaver lock (another process may have started concurrently)');
  }

  return record;
}

export function releaseClusterLock(configPath: string): void {
  const lockPath = `${defaultWorkspaceDir(configPath)}/lock.json`;

  if (!fs.existsSync(lockPath)) {
    return;
  }

  const existing = readClusterLock(lockPath);

  if (existing && existing.pid === process.pid) {
    fs.unlinkSync(lockPath);
  }
}
