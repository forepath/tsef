import { buildHealthyDependsOn, type CloudInitComposeServiceParams } from './compose-service.utils';

/**
 * Shared OpenSearch compose fragments for provisioned Decabill and Agenstra Controller stacks.
 * Keep the node on the compose network only (no host port publish) so search is not internet-facing.
 */
export const OPENSEARCH_COMPOSE_IMAGE = 'opensearchproject/opensearch:2.19.1';

export const OPENSEARCH_COMPOSE_DEPENDS_ON = buildHealthyDependsOn('opensearch');

export function buildOpenSearchBackendEnvLines(indexPrefix: string): string[] {
  return [
    'OPENSEARCH_ENABLED: true',
    'OPENSEARCH_HOST: opensearch',
    'OPENSEARCH_PORT: 9200',
    'OPENSEARCH_NODE: http://opensearch:9200',
    'OPENSEARCH_USERNAME: ',
    'OPENSEARCH_PASSWORD: ',
    `OPENSEARCH_INDEX_PREFIX: ${indexPrefix}`,
    'SEARCH_REINDEX_INTERVAL: 15m',
  ];
}

export function buildOpenSearchComposeService(params: CloudInitComposeServiceParams): string {
  return `  opensearch:
    image: ${OPENSEARCH_COMPOSE_IMAGE}
    container_name: ${params.containerName}
    environment:
      discovery.type: single-node
      plugins.security.disabled: 'true'
      OPENSEARCH_JAVA_OPTS: '-Xms512m -Xmx512m'
      DISABLE_INSTALL_DEMO_CONFIG: 'true'
    volumes:
      - opensearch_data:/usr/share/opensearch/data
    healthcheck:
      test: ['CMD-SHELL', 'curl -sf http://localhost:9200/_cluster/health || exit 1']
      interval: 15s
      timeout: 10s
      retries: 10
    networks:
      - ${params.network}
    restart: unless-stopped
    ulimits:
      memlock:
        soft: -1
        hard: -1
      nofile:
        soft: 65536
        hard: 65536`;
}

export function buildOpenSearchHostSysctlScript(): string {
  return `# OpenSearch mmapfs requires vm.max_map_count >= 262144
log "Configuring vm.max_map_count for OpenSearch..."
sysctl -w vm.max_map_count=262144
mkdir -p /etc/sysctl.d
echo "vm.max_map_count=262144" > /etc/sysctl.d/99-opensearch.conf
`;
}
