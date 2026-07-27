import { isOtelMetricsRequestPath } from './otel-metrics-request-path';

describe('isOtelMetricsRequestPath', () => {
  it('matches default /otel/metrics', () => {
    const env = {
      OTEL_ENABLED: 'true',
      OTEL_USERNAME: 'otel',
      OTEL_PASSWORD: 'secret',
    };

    expect(isOtelMetricsRequestPath('/otel/metrics', env)).toBe(true);
    expect(isOtelMetricsRequestPath('/otel/metrics/', env)).toBe(true);
    expect(isOtelMetricsRequestPath('/api/health', env)).toBe(false);
  });

  it('matches custom OTEL_METRICS_PATH', () => {
    const env = {
      OTEL_ENABLED: 'true',
      OTEL_USERNAME: 'otel',
      OTEL_PASSWORD: 'secret',
      OTEL_METRICS_PATH: '/ops/metrics',
    };

    expect(isOtelMetricsRequestPath('/ops/metrics', env)).toBe(true);
    expect(isOtelMetricsRequestPath('/ops/metrics?foo=1', env)).toBe(true);
    expect(isOtelMetricsRequestPath('/otel/metrics', env)).toBe(false);
  });

  it('does not match when OTEL is disabled', () => {
    expect(
      isOtelMetricsRequestPath('/otel/metrics', {
        OTEL_ENABLED: 'false',
        OTEL_USERNAME: 'otel',
        OTEL_PASSWORD: 'secret',
      }),
    ).toBe(false);
  });

  it('does not match when OTEL credentials are incomplete', () => {
    expect(
      isOtelMetricsRequestPath('/otel/metrics', {
        OTEL_ENABLED: 'true',
        OTEL_USERNAME: 'otel',
        OTEL_PASSWORD: '   ',
      }),
    ).toBe(false);
  });
});
