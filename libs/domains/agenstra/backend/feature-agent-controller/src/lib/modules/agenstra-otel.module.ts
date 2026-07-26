import { OpenTelemetryModule } from '@forepath/shared/backend/util-otel';
import { BullMqOtelMetricsCollector } from '@forepath/shared/backend/util-otel/bullmq';
import { Module } from '@nestjs/common';

import { AGENSTRA_CONTROLLER_QUEUE_NAME } from './agenstra-notifications.module';

export const agenstraOtelModule = OpenTelemetryModule.register({
  applicationId: 'agenstra-agent-controller',
  queueNames: [AGENSTRA_CONTROLLER_QUEUE_NAME],
  extraProviders: [BullMqOtelMetricsCollector],
});

@Module({
  imports: [agenstraOtelModule],
  exports: [agenstraOtelModule],
})
export class AgenstraOtelModule {}
