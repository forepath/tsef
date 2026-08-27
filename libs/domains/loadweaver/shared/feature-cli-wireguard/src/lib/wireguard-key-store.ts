import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { wireguardKeysPath } from '@forepath/loadweaver/shared/util-cli-core';

export interface WireguardKeyPair {
  privateKey: string;
  publicKey: string;
  rotatedAt?: string;
}

export interface WireguardKeyStore {
  version: number;
  nodes: Record<string, WireguardKeyPair>;
}

export type WireguardKeyGenerator = (nodeId: string) => Promise<WireguardKeyPair>;

export function loadWireguardKeyStore(configPath: string): WireguardKeyStore {
  const keysPath = wireguardKeysPath(configPath);

  if (!fs.existsSync(keysPath)) {
    return { version: 1, nodes: {} };
  }

  return JSON.parse(fs.readFileSync(keysPath, 'utf-8')) as WireguardKeyStore;
}

export function saveWireguardKeyStore(configPath: string, store: WireguardKeyStore): void {
  const keysPath = wireguardKeysPath(configPath);
  fs.mkdirSync(path.dirname(keysPath), { recursive: true });
  fs.writeFileSync(keysPath, `${JSON.stringify(store, null, 2)}\n`, { mode: 0o600 });
}

export function removeWireguardKeys(configPath: string, nodeIds: string[]): void {
  const store = loadWireguardKeyStore(configPath);

  for (const nodeId of nodeIds) {
    delete store.nodes[nodeId];
  }

  if (Object.keys(store.nodes).length === 0) {
    clearWireguardKeyStore(configPath);
    return;
  }

  saveWireguardKeyStore(configPath, store);
}

export function clearWireguardKeyStore(configPath: string): void {
  const keysPath = wireguardKeysPath(configPath);

  if (fs.existsSync(keysPath)) {
    fs.unlinkSync(keysPath);
  }
}

export async function rotateWireguardKeys(
  configPath: string,
  nodeIds: string[],
  generate: WireguardKeyGenerator,
  dryRun: boolean,
): Promise<WireguardKeyStore> {
  const store = loadWireguardKeyStore(configPath);

  const rotatedAt = new Date().toISOString();

  for (const nodeId of nodeIds) {
    store.nodes[nodeId] = {
      ...(await generate(nodeId)),
      rotatedAt,
    };
  }

  if (!dryRun) {
    saveWireguardKeyStore(configPath, store);
  }

  return store;
}

export async function ensureWireguardKeys(
  configPath: string,
  nodeIds: string[],
  generate: WireguardKeyGenerator,
  dryRun: boolean,
): Promise<WireguardKeyStore> {
  const store = loadWireguardKeyStore(configPath);
  let changed = false;

  for (const nodeId of nodeIds) {
    if (store.nodes[nodeId]) {
      continue;
    }

    store.nodes[nodeId] = {
      ...(await generate(nodeId)),
      rotatedAt: new Date().toISOString(),
    };
    changed = true;
  }

  if (changed && !dryRun) {
    saveWireguardKeyStore(configPath, store);
  }

  return store;
}

export function generateDryRunWireguardKeyPair(nodeId: string): WireguardKeyPair {
  const seed = crypto.createHash('sha256').update(`loadweaver-dry-run:${nodeId}`).digest('base64');

  return {
    privateKey: seed,
    publicKey: crypto.createHash('sha256').update(`pub:${nodeId}`).digest('base64'),
  };
}
