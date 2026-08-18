import {
  REDIS_COMPOSE_DEPENDS_ON,
  REDIS_COMPOSE_IMAGE,
  buildRedisBackendEnvLines,
  buildRedisComposeService,
} from './redis-compose.utils';

describe('redis-compose.utils', () => {
  describe('buildRedisBackendEnvLines', () => {
    it('points backends at the compose Redis service with the given key prefix', () => {
      expect(buildRedisBackendEnvLines('decabill-billing')).toEqual([
        'REDIS_HOST: redis',
        'REDIS_PORT: 6379',
        'REDIS_PASSWORD: ',
        'REDIS_DB: 0',
        'REDIS_KEY_PREFIX: decabill-billing',
      ]);
    });
  });

  describe('buildRedisComposeService', () => {
    it('emits AOF Redis without publishing host ports', () => {
      const yaml = buildRedisComposeService({
        containerName: 'agent-controller-redis',
        network: 'agent-controller-network',
      });

      expect(yaml).toContain(`image: ${REDIS_COMPOSE_IMAGE}`);
      expect(yaml).toContain('container_name: agent-controller-redis');
      expect(yaml).toContain("command: ['redis-server', '--appendonly', 'yes']");
      expect(yaml).toContain('redis_data:/data');
      expect(yaml).not.toContain('ports:');
    });
  });

  it('exports a compose depends_on fragment for healthy Redis', () => {
    expect(REDIS_COMPOSE_DEPENDS_ON).toContain('redis:');
    expect(REDIS_COMPOSE_DEPENDS_ON).toContain('condition: service_healthy');
  });
});
