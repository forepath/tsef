import { Inject, Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { Application } from 'express';

import { createOtelBasicAuthMiddleware } from './otel-basic-auth.middleware';
import { OTEL_RUNTIME_CONFIG } from './otel-module.options';
import type { OtelRuntimeConfig } from './otel-runtime.config';
import { getPrometheusExporter } from './otel-sdk';

@Injectable()
export class OtelMetricsHttpRegistrar implements OnModuleInit {
  private readonly logger = new Logger(OtelMetricsHttpRegistrar.name);

  constructor(
    @Optional() private readonly httpAdapterHost: HttpAdapterHost | undefined,
    @Inject(OTEL_RUNTIME_CONFIG) private readonly config: OtelRuntimeConfig,
  ) {}

  onModuleInit(): void {
    const exporter = getPrometheusExporter();

    if (!exporter) {
      return;
    }

    const httpAdapter = this.httpAdapterHost?.httpAdapter;

    // Workers/schedulers use NestApplicationContext (no HTTP adapter).
    if (!httpAdapter) {
      this.logger.debug('Skipping OTEL metrics HTTP route: no HTTP adapter (application context)');

      return;
    }

    const instance = httpAdapter.getInstance<Application>();
    const authMiddleware = createOtelBasicAuthMiddleware({
      username: this.config.username,
      password: this.config.password,
    });
    const metricsHandler = exporter.getMetricsRequestHandler.bind(exporter);

    instance.get(this.config.metricsPath, authMiddleware, metricsHandler);
  }
}
