import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  acquireClusterLock,
  createLockRecord,
  isClusterLockStale,
  readClusterLock,
  releaseClusterLock,
} from './cluster-lock';
import { defaultWorkspaceDir } from './paths';

describe('cluster lock', () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loadweaver-lock-'));
    configPath = path.join(tempDir, 'loadweaver.yml');
    fs.writeFileSync(configPath, 'version: 1\n');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('acquires and releases a lock for the current process', () => {
    const record = acquireClusterLock(configPath, 'cluster.update');
    expect(record.pid).toBe(process.pid);

    releaseClusterLock(configPath);

    expect(readClusterLock(path.join(defaultWorkspaceDir(configPath), 'lock.json'))).toBeUndefined();
  });

  it('treats locks held by dead processes as stale', () => {
    const lockPath = path.join(defaultWorkspaceDir(configPath), 'lock.json');
    fs.mkdirSync(path.dirname(lockPath), { recursive: true });
    fs.writeFileSync(lockPath, JSON.stringify(createLockRecord('cluster.init', configPath)));

    const stale = readClusterLock(lockPath)!;
    stale.pid = 999_999;

    expect(isClusterLockStale(stale)).toBe(true);
  });
});
