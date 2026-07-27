import type { ConnectionOptions } from 'bullmq';

export interface OtelRedisConnectionConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
}

/**
 * Local Redis env reader for BullMQ OTEL gauges.
 * Kept inside util-otel so buildable consumers of `/metrics` never pull util-queue sources.
 */
export function readOtelRedisConnectionConfig(env: NodeJS.ProcessEnv = process.env): OtelRedisConnectionConfig {
  const password = env['REDIS_PASSWORD']?.trim();

  return {
    host: env['REDIS_HOST']?.trim() || 'localhost',
    port: parseInt(env['REDIS_PORT'] ?? '6379', 10),
    ...(password ? { password } : {}),
    db: parseInt(env['REDIS_DB'] ?? '0', 10),
    keyPrefix: env['REDIS_KEY_PREFIX']?.trim() || 'agenstra',
  };
}

export function toOtelBullMqConnection(config: OtelRedisConnectionConfig): ConnectionOptions {
  return {
    host: config.host,
    port: config.port,
    db: config.db,
    ...(config.password ? { password: config.password } : {}),
  };
}
