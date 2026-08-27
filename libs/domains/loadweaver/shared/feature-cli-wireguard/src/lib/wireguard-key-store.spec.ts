import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  ensureWireguardKeys,
  generateDryRunWireguardKeyPair,
  loadWireguardKeyStore,
  removeWireguardKeys,
  saveWireguardKeyStore,
} from './wireguard-key-store';

describe('wireguard key store', () => {
  let tmpDir: string;
  let configPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loadweaver-wg-keys-'));
    configPath = path.join(tmpDir, 'loadweaver.yml');
    fs.writeFileSync(configPath, 'version: 1\n');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('generates deterministic dry-run keys without persisting', async () => {
    const store = await ensureWireguardKeys(
      configPath,
      ['node-a1', 'node-a2'],
      async (nodeId) => generateDryRunWireguardKeyPair(nodeId),
      true,
    );

    expect(store.nodes['node-a1']).toBeDefined();
    expect(store.nodes['node-a2']).toBeDefined();
    expect(store.nodes['node-a1']?.publicKey).not.toBe(store.nodes['node-a2']?.publicKey);

    const keysPath = path.join(tmpDir, '.loadweaver', 'wireguard', 'keys.json');
    expect(fs.existsSync(keysPath)).toBe(false);
  });

  it('persists newly generated keys when not in dry-run mode', async () => {
    const keysPath = path.join(tmpDir, '.loadweaver', 'wireguard', 'keys.json');
    await ensureWireguardKeys(
      configPath,
      ['node-a1'],
      async () => ({ privateKey: 'test-private-key', publicKey: 'test-public-key' }),
      false,
    );
    expect(fs.existsSync(keysPath)).toBe(true);

    const loaded = loadWireguardKeyStore(configPath);
    expect(loaded.nodes['node-a1']).toMatchObject({
      privateKey: 'test-private-key',
      publicKey: 'test-public-key',
    });
    expect(loaded.nodes['node-a1']?.rotatedAt).toEqual(expect.any(String));
  });

  it('round-trips key store through save and load', () => {
    const store = {
      version: 1,
      nodes: {
        'node-a1': { privateKey: 'priv', publicKey: 'pub' },
      },
    };

    saveWireguardKeyStore(configPath, store);
    expect(loadWireguardKeyStore(configPath)).toEqual(store);
  });

  it('removes node keys and clears the store when empty', () => {
    saveWireguardKeyStore(configPath, {
      version: 1,
      nodes: { 'node-a1': { privateKey: 'priv', publicKey: 'pub' } },
    });

    removeWireguardKeys(configPath, ['node-a1']);
    expect(loadWireguardKeyStore(configPath).nodes).toEqual({});
    expect(fs.existsSync(path.join(tmpDir, '.loadweaver', 'wireguard', 'keys.json'))).toBe(false);
  });
});
