import { buildHaproxyConfig } from './haproxy-config.builder';

describe('buildHaproxyConfig', () => {
  it('renders frontends and backends for tcp listeners', () => {
    const config = buildHaproxyConfig([
      {
        name: 'postgres_5432',
        port: 5432,
        protocol: 'tcp',
        servers: [
          { name: 'postgres_5432_n0', address: '10.200.0.1', port: 5432 },
          { name: 'postgres_5432_h1', address: '10.200.0.50', port: 5432 },
        ],
      },
    ]);

    expect(config).toContain('frontend fe_postgres_5432');
    expect(config).toContain('bind *:5432');
    expect(config).toContain('mode tcp');
    expect(config).toContain('server postgres_5432_n0 10.200.0.1:5432 check');
    expect(config).toContain('server postgres_5432_h1 10.200.0.50:5432 check');
  });

  it('marks empty backends without failing render', () => {
    const config = buildHaproxyConfig([
      {
        name: 'api_8080',
        port: 8080,
        protocol: 'http',
        servers: [],
      },
    ]);

    expect(config).toContain('mode http');
    expect(config).toContain('# no backends resolved');
  });
});
