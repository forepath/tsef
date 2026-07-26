import { OpenTelemetryModule } from '@forepath/shared/backend/util-otel';
import { BullMqOtelMetricsCollector } from '@forepath/shared/backend/util-otel/bullmq';
import { Module } from '@nestjs/common';

import { BILLING_QUEUE_NAME } from '../queue/billing-queue.constants';

export const decabillOtelModule = OpenTelemetryModule.register({
  applicationId: 'decabill-billing-manager',
  queueNames: [BILLING_QUEUE_NAME],
  extraProviders: [BullMqOtelMetricsCollector],
});

@Module({
  imports: [decabillOtelModule],
  exports: [decabillOtelModule],
})
export class DecabillOtelModule {}
