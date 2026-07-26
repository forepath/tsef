/**
 * Matches HTTP paths served by OpenTelemetry Prometheus scrape (uses OTEL_METRICS_PATH).
 * Used to bypass API guards that conflict with OTEL HTTP Basic auth.
 *
 * Fail closed: only returns true when OTEL is effectively enabled (kill switch on AND
 * both Basic auth credentials are set). Does not import util-otel (keeps util-auth/core light).
 */
export function isOtelMetricsRequestPath(urlPath: string, env: NodeJS.ProcessEnv = process.env): boolean {
  if (env['OTEL_ENABLED'] !== 'true') {
    return false;
  }

  const username = env['OTEL_USERNAME']?.trim() ?? '';
  const password = env['OTEL_PASSWORD']?.trim() ?? '';

  if (!username || !password) {
    return false;
  }

  const metricsPath = (env['OTEL_METRICS_PATH']?.trim() || '/otel/metrics').replace(/\/+$/, '');
  const base = metricsPath.startsWith('/') ? metricsPath : `/${metricsPath}`;
  const path = urlPath.split('?')[0]?.replace(/\/+$/, '') ?? '';

  return path === base || path.startsWith(`${base}/`);
}
