import { OpenTelemetryModule } from '@forepath/shared/backend/util-otel';
import { Module } from '@nestjs/common';

export const agenstraOtelModule = OpenTelemetryModule.register({
  applicationId: 'agenstra-agent-manager',
});

@Module({
  imports: [agenstraOtelModule],
  exports: [agenstraOtelModule],
})
export class AgenstraOtelModule {}
