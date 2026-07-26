import { RequestMethod } from '@nestjs/common';
import type { RouteInfo } from '@nestjs/common/interfaces';

import { isOtelEffectivelyEnabled, resolveOtelRuntimeConfig } from './otel-runtime.config';

/**
 * Routes excluded from Nest's global prefix so Prometheus metrics stay at OTEL_METRICS_PATH
 * (e.g. /otel/metrics) instead of /api/otel/metrics.
 */
export function getOtelMetricsGlobalPrefixExcludes(env: NodeJS.ProcessEnv = process.env): RouteInfo[] {
  const config = resolveOtelRuntimeConfig(env);

  if (!isOtelEffectivelyEnabled(config)) {
    return [];
  }

  const route = config.metricsPath.replace(/^\//, '');

  return [{ path: route, method: RequestMethod.ALL }];
}
