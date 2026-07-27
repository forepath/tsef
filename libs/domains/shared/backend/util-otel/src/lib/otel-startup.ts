import type { LoggerService } from '@nestjs/common';

import { isOtelEffectivelyEnabled, type OtelRuntimeConfig } from './otel-runtime.config';

const OTEL_LOGGER_CONTEXT = 'OpenTelemetry';

export function logOtelStartupStatus(logger: LoggerService, config: OtelRuntimeConfig): void {
  if (!isOtelEffectivelyEnabled(config)) {
    logger.log(`OpenTelemetry disabled: ${config.disableReason ?? 'unknown reason'}`, OTEL_LOGGER_CONTEXT);

    return;
  }

  const otlpStatus = config.otlpEndpoint ? 'enabled' : 'disabled';

  logger.log(
    `OpenTelemetry enabled: metricsPath=${config.metricsPath}, serviceName=${config.serviceName}, otlp=${otlpStatus}`,
    OTEL_LOGGER_CONTEXT,
  );
}
