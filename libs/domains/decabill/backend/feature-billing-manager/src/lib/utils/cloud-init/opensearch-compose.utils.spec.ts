import {
  OPENSEARCH_COMPOSE_DEPENDS_ON,
  OPENSEARCH_COMPOSE_IMAGE,
  buildOpenSearchBackendEnvLines,
  buildOpenSearchComposeService,
  buildOpenSearchHostSysctlScript,
} from './opensearch-compose.utils';

describe('opensearch-compose.utils', () => {
  describe('buildOpenSearchBackendEnvLines', () => {
    it('points backends at the compose OpenSearch service with the given index prefix', () => {
      expect(buildOpenSearchBackendEnvLines('decabill')).toEqual([
        'OPENSEARCH_ENABLED: true',
        'OPENSEARCH_HOST: opensearch',
        'OPENSEARCH_PORT: 9200',
        'OPENSEARCH_NODE: http://opensearch:9200',
        'OPENSEARCH_USERNAME: ',
        'OPENSEARCH_PASSWORD: ',
        'OPENSEARCH_INDEX_PREFIX: decabill',
        'SEARCH_REINDEX_INTERVAL: 15m',
      ]);
    });
  });

  describe('buildOpenSearchComposeService', () => {
    it('emits a single-node service without publishing host ports', () => {
      const yaml = buildOpenSearchComposeService({
        containerName: 'decabill-billing-opensearch',
        network: 'decabill-billing-network',
      });

      expect(yaml).toContain(`image: ${OPENSEARCH_COMPOSE_IMAGE}`);
      expect(yaml).toContain('container_name: decabill-billing-opensearch');
      expect(yaml).toContain('decabill-billing-network');
      expect(yaml).toContain('opensearch_data:/usr/share/opensearch/data');
      expect(yaml).toContain("plugins.security.disabled: 'true'");
      expect(yaml).not.toContain('ports:');
    });
  });

  describe('buildOpenSearchHostSysctlScript', () => {
    it('persists vm.max_map_count for OpenSearch mmapfs', () => {
      const script = buildOpenSearchHostSysctlScript();

      expect(script).toContain('sysctl -w vm.max_map_count=262144');
      expect(script).toContain('/etc/sysctl.d/99-opensearch.conf');
    });
  });

  it('exports a compose depends_on fragment for healthy OpenSearch', () => {
    expect(OPENSEARCH_COMPOSE_DEPENDS_ON).toContain('opensearch:');
    expect(OPENSEARCH_COMPOSE_DEPENDS_ON).toContain('condition: service_healthy');
  });
});
