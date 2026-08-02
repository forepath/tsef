import type { Request } from 'express';

import type { UpdatesPublishNotification } from './updates.interfaces';

export interface UpdatesModuleOptions {
  applicationId: 'agenstra' | 'decabill';
  productScope: 'agenstra' | 'decabill';
  serviceName: 'billing-manager' | 'agent-controller' | 'agent-manager';
  controllerPath: string;
  queueName: string;
  assertAdmin: (req: Request) => void;
  resolveScopeKey: () => string;
  github?: { owner?: string; repo?: string; tokenEnv?: string };
  versionEnv?: string;
  heartbeatIntervalMs?: number;
  publishNotification?: UpdatesPublishNotification;
  /** Optional scrape of remote instances before check (agenstra managers). */
  refreshRemoteInstances?: () => Promise<void>;
  /** Override role detection; default QUEUE_ROLE or AGENT_MANAGER_ROLE or 'api'. */
  resolveServiceRole?: () => string;
}
