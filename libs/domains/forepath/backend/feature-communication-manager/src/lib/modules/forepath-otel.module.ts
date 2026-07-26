import { OpenTelemetryModule, setGauge } from '@forepath/shared/backend/util-otel';
import { Module } from '@nestjs/common';

function isChatwootConfiguredFromEnv(): boolean {
  const baseUrl = process.env.CHATWOOT_BASE_URL?.trim();
  const apiToken = process.env.CHATWOOT_API_ACCESS_TOKEN?.trim();
  const accountId = parseInt(process.env.CHATWOOT_ACCOUNT_ID ?? '', 10);
  const inboxId = parseInt(process.env.CHATWOOT_INBOX_ID ?? '', 10);

  return Boolean(baseUrl && apiToken && Number.isFinite(accountId) && Number.isFinite(inboxId));
}

export const forepathOtelModule = OpenTelemetryModule.register({
  applicationId: 'forepath-communication',
  registerDomainMetrics: () => {
    setGauge('forepath.communication', 'communication.chatwoot.configured', isChatwootConfiguredFromEnv() ? 1 : 0);
  },
});

@Module({
  imports: [forepathOtelModule],
  exports: [forepathOtelModule],
})
export class ForepathOtelModule {}
