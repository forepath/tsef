import {
  POSTGRES_COMPOSE_DEPENDS_ON,
  POSTGRES_COMPOSE_IMAGE,
  POSTGRES_PGVECTOR_COMPOSE_IMAGE,
  buildPostgresBackendEnvLines,
  buildPostgresComposeService,
} from './postgres-compose.utils';

describe('postgres-compose.utils', () => {
  describe('buildPostgresBackendEnvLines', () => {
    it('defaults to the compose postgres service', () => {
      expect(buildPostgresBackendEnvLines()).toEqual([
        'DB_HOST: postgres',
        'DB_PORT: 5432',
        'DB_USERNAME: postgres',
        'DB_PASSWORD: postgres',
        'DB_DATABASE: postgres',
      ]);
    });

    it('passes through provisioned credentials', () => {
      expect(
        buildPostgresBackendEnvLines({
          host: 'postgres',
          port: 5432,
          username: 'billing',
          password: 's3cret',
          database: 'decabill',
        }),
      ).toEqual([
        'DB_HOST: postgres',
        'DB_PORT: 5432',
        'DB_USERNAME: billing',
        'DB_PASSWORD: s3cret',
        'DB_DATABASE: decabill',
      ]);
    });
  });

  describe('buildPostgresComposeService', () => {
    it('emits vanilla Postgres without publishing host ports', () => {
      const yaml = buildPostgresComposeService({
        containerName: 'decabill-billing-postgres',
        network: 'decabill-billing-network',
      });

      expect(yaml).toContain(`image: ${POSTGRES_COMPOSE_IMAGE}`);
      expect(yaml).toContain('container_name: decabill-billing-postgres');
      expect(yaml).toContain('postgres_data:/var/lib/postgresql/data');
      expect(yaml).not.toContain('ports:');
    });

    it('uses the pgvector image when requested', () => {
      const yaml = buildPostgresComposeService({
        containerName: 'agent-controller-postgres',
        network: 'agent-controller-network',
        image: POSTGRES_PGVECTOR_COMPOSE_IMAGE,
      });

      expect(yaml).toContain(`image: ${POSTGRES_PGVECTOR_COMPOSE_IMAGE}`);
    });

    it('quotes YAML-significant passwords', () => {
      const yaml = buildPostgresComposeService({
        containerName: 'agent-manager-postgres',
        network: 'agent-manager-network',
        password: 'a:b',
      });

      expect(yaml).toContain("POSTGRES_PASSWORD: 'a:b'");
    });
  });

  it('exports a compose depends_on fragment for healthy Postgres', () => {
    expect(POSTGRES_COMPOSE_DEPENDS_ON).toContain('postgres:');
    expect(POSTGRES_COMPOSE_DEPENDS_ON).toContain('condition: service_healthy');
  });
});
