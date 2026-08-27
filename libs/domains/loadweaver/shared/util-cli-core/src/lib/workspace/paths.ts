import * as path from 'node:path';

export function defaultWorkspaceDir(configPath: string): string {
  const configDir = path.dirname(path.resolve(configPath));
  return path.join(configDir, '.loadweaver');
}

export function clusterStatePath(configPath: string): string {
  return path.join(defaultWorkspaceDir(configPath), 'state.json');
}

export function clusterLockPath(configPath: string): string {
  return path.join(defaultWorkspaceDir(configPath), 'lock.json');
}

export function wireguardKeysPath(configPath: string): string {
  return path.join(defaultWorkspaceDir(configPath), 'wireguard', 'keys.json');
}

export function routingKeysPath(configPath: string): string {
  return path.join(defaultWorkspaceDir(configPath), 'routing', 'cross-wg-keys.json');
}
