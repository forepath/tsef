import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { OTEL_MODULE_OPTIONS, OTEL_RUNTIME_CONFIG, type OpenTelemetryModuleOptions } from './otel-module.options';
import type { OtelRuntimeConfig } from './otel-runtime.config';
import { shutdownOtelSdk, getMeter } from './otel-sdk';

/**
 * Ensures SDK shutdown on Nest teardown. SDK start + startup logging happen in app bootstrap
 * before NestFactory so instrumentation covers Nest itself.
 */
@Injectable()
export class OtelSdkBootstrap implements OnModuleDestroy {
  constructor(@Inject(OTEL_RUNTIME_CONFIG) private readonly _config: OtelRuntimeConfig) {}

  async onModuleDestroy(): Promise<void> {
    await shutdownOtelSdk();
  }
}

@Injectable()
export class OtelDomainMetricsBootstrap implements OnModuleInit {
  constructor(@Inject(OTEL_MODULE_OPTIONS) private readonly options: OpenTelemetryModuleOptions) {}

  async onModuleInit(): Promise<void> {
    if (!this.options.registerDomainMetrics) {
      return;
    }

    await this.options.registerDomainMetrics(getMeter);
  }
}
