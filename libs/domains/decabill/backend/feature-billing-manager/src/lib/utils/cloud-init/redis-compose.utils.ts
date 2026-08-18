/**
 * Shared Redis compose fragments for provisioned Decabill and Agenstra Controller stacks.
 * Keep Redis on the compose network only (no host port publish); AOF is enabled for BullMQ durability.
 */
import { buildHealthyDependsOn, type CloudInitComposeServiceParams } from './compose-service.utils';

export const REDIS_COMPOSE_IMAGE = 'redis:7-alpine';
export const REDIS_COMPOSE_DEPENDS_ON = buildHealthyDependsOn('redis');

export function buildRedisBackendEnvLines(keyPrefix: string): string[] {
  return ['REDIS_HOST: redis', 'REDIS_PORT: 6379', 'REDIS_PASSWORD: ', 'REDIS_DB: 0', `REDIS_KEY_PREFIX: ${keyPrefix}`];
}

export function buildRedisComposeService(params: CloudInitComposeServiceParams): string {
  return `  redis:
    image: ${REDIS_COMPOSE_IMAGE}
    container_name: ${params.containerName}
    command: ['redis-server', '--appendonly', 'yes']
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - ${params.network}
    restart: unless-stopped`;
}
