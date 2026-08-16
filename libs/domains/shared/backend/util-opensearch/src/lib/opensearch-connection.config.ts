export interface OpenSearchConnectionConfig {
  node: string;
  username?: string;
  password?: string;
  enabled: boolean;
  indexPrefix: string;
}

export function readOpenSearchConnectionConfig(env: NodeJS.ProcessEnv = process.env): OpenSearchConnectionConfig {
  const enabledRaw = env['OPENSEARCH_ENABLED']?.trim().toLowerCase();
  const enabled = enabledRaw !== 'false' && enabledRaw !== '0';
  const host = env['OPENSEARCH_HOST']?.trim() || 'localhost';
  const port = parseInt(env['OPENSEARCH_PORT'] ?? '9200', 10);
  const nodeFromEnv = env['OPENSEARCH_NODE']?.trim();
  const username = env['OPENSEARCH_USERNAME']?.trim();
  const password = env['OPENSEARCH_PASSWORD']?.trim();

  return {
    node: nodeFromEnv || `http://${host}:${Number.isFinite(port) ? port : 9200}`,
    ...(username ? { username } : {}),
    ...(password ? { password } : {}),
    enabled,
    indexPrefix: env['OPENSEARCH_INDEX_PREFIX']?.trim() || 'forepath',
  };
}

export function buildOpenSearchIndexName(entity: string, env: NodeJS.ProcessEnv = process.env): string {
  const config = readOpenSearchConnectionConfig(env);
  const normalized = entity
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${config.indexPrefix}-${normalized}`;
}
