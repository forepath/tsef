import {
  buildCoordinatorJobId,
  envCronOrDefault,
  getWebhookDeliveryRetentionCoordinatorIntervalMs,
  UPDATE_CHECK_JOB_NAME,
  WEBHOOK_DELIVERY_RETENTION_COORDINATOR,
} from '@forepath/shared/backend';

/** Central registry for agent-controller BullMQ queues, job names, and coordinator schedules. */

export const CONTROLLER_QUEUE_NAME = 'agent-controller';

export const ControllerJobName = {
  CONTEXT_IMPORT_COORDINATOR: 'context-import.coordinator',
  CONTEXT_IMPORT_UNIT: 'context-import.unit',
  KNOWLEDGE_EMBEDDING_COORDINATOR: 'knowledge-embedding.coordinator',
  KNOWLEDGE_EMBEDDING_UNIT: 'knowledge-embedding.unit',
  FILTER_RULES_SYNC_COORDINATOR: 'filter-rules-sync.coordinator',
  FILTER_RULES_SYNC_UNIT: 'filter-rules-sync.unit',
  FILTER_RULES_RECONCILE: 'filter-rules-sync.reconcile',
  AUTONOMOUS_TICKET_COORDINATOR: 'autonomous-ticket.coordinator',
  AUTONOMOUS_TICKET_UNIT: 'autonomous-ticket.unit',
  SEARCH_REINDEX_COORDINATOR: 'search-reindex.coordinator',
  SEARCH_REINDEX_UNIT: 'search-reindex.unit',
  SEARCH_INDEX_SYNC_UNIT: 'search-index-sync.unit',
  WEBHOOK_DELIVERY_RETENTION_COORDINATOR,
  UPDATE_CHECK: UPDATE_CHECK_JOB_NAME,
} as const;

export type ControllerJobName = (typeof ControllerJobName)[keyof typeof ControllerJobName];

export interface ControllerRepeatableJobDefinition {
  name: ControllerJobName;
  coordinatorJobId: string;
  everyMs?: number;
  pattern?: string;
  tz?: string;
  disabled?: boolean;
}

function parseIntervalMs(envKey: string, fallback: number): number {
  const parsed = parseInt(process.env[envKey] ?? String(fallback), 10);

  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Parses SEARCH_REINDEX_INTERVAL values like `15m`, `1h`, or raw milliseconds. */
export function parseSearchReindexIntervalMs(envKey: string, fallbackMs: number): number {
  const raw = process.env[envKey]?.trim();

  if (!raw) {
    return fallbackMs;
  }

  const match = /^(\d+)\s*(ms|s|m|h|d)?$/i.exec(raw);

  if (!match) {
    const asInt = parseInt(raw, 10);

    return Number.isFinite(asInt) && asInt > 0 ? asInt : fallbackMs;
  }

  const amount = parseInt(match[1], 10);
  const unit = (match[2] ?? 'ms').toLowerCase();
  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };

  return amount * (multipliers[unit] ?? 1);
}

export function getControllerRepeatableJobs(): ControllerRepeatableJobDefinition[] {
  const knowledgeInterval = parseIntervalMs('KNOWLEDGE_EMBEDDINGS_REINDEX_INTERVAL_MS', 3_600_000);
  const contextImportInterval = parseIntervalMs('CONTEXT_IMPORT_SCHEDULER_INTERVAL_MS', 120_000);
  const searchReindexInterval = parseSearchReindexIntervalMs('SEARCH_REINDEX_INTERVAL', 900_000);
  const jobs: ControllerRepeatableJobDefinition[] = [
    {
      name: ControllerJobName.FILTER_RULES_SYNC_COORDINATOR,
      coordinatorJobId: buildCoordinatorJobId('filter-rules-sync'),
      everyMs: parseIntervalMs('FILTER_RULES_SYNC_INTERVAL_MS', 30_000),
    },
    {
      name: ControllerJobName.FILTER_RULES_RECONCILE,
      coordinatorJobId: buildCoordinatorJobId('filter-rules-reconcile'),
      everyMs: parseIntervalMs('FILTER_RULES_SYNC_INTERVAL_MS', 30_000),
    },
    {
      name: ControllerJobName.AUTONOMOUS_TICKET_COORDINATOR,
      coordinatorJobId: buildCoordinatorJobId('autonomous-ticket'),
      everyMs: parseIntervalMs('AUTONOMOUS_TICKET_SCHEDULER_INTERVAL_MS', 60_000),
    },
    {
      name: ControllerJobName.WEBHOOK_DELIVERY_RETENTION_COORDINATOR,
      coordinatorJobId: buildCoordinatorJobId('webhook-delivery-retention'),
      everyMs: getWebhookDeliveryRetentionCoordinatorIntervalMs(),
    },
  ];

  if (contextImportInterval > 0) {
    jobs.push({
      name: ControllerJobName.CONTEXT_IMPORT_COORDINATOR,
      coordinatorJobId: buildCoordinatorJobId('context-import'),
      everyMs: contextImportInterval,
    });
  }

  if (knowledgeInterval > 0) {
    jobs.push({
      name: ControllerJobName.KNOWLEDGE_EMBEDDING_COORDINATOR,
      coordinatorJobId: buildCoordinatorJobId('knowledge-embedding'),
      everyMs: knowledgeInterval,
    });
  }

  if (searchReindexInterval > 0) {
    jobs.push({
      name: ControllerJobName.SEARCH_REINDEX_COORDINATOR,
      coordinatorJobId: buildCoordinatorJobId('search-reindex'),
      everyMs: searchReindexInterval,
    });
  }

  jobs.push({
    name: ControllerJobName.UPDATE_CHECK,
    coordinatorJobId: buildCoordinatorJobId('update-check'),
    pattern: envCronOrDefault('UPDATE_CHECK_CRON', '0 0 * * *'),
    tz: process.env.UPDATE_CHECK_TIMEZONE ?? 'Europe/Berlin',
  });

  return jobs;
}

export function getContextImportItemBudget(): number {
  return parseInt(process.env.CONTEXT_IMPORT_ITEM_BUDGET ?? '25', 10);
}

export function getContextImportConfigBatch(): number {
  return parseInt(process.env.CONTEXT_IMPORT_SCHEDULER_CONFIG_BATCH ?? '3', 10);
}

export function getFilterRulesSyncBatchSize(): number {
  return parseInt(process.env.FILTER_RULES_SYNC_BATCH_SIZE ?? '10', 10);
}

export function getAutonomousTicketBatchSize(): number {
  return parseInt(process.env.AUTONOMOUS_TICKET_SCHEDULER_BATCH_SIZE ?? '5', 10);
}

export function getKnowledgeEmbeddingPageBatchSize(): number {
  return parseInt(process.env.KNOWLEDGE_EMBEDDINGS_PAGE_BATCH_SIZE ?? '50', 10);
}

export function getSearchReindexBatchSize(): number {
  return parseInt(process.env.SEARCH_REINDEX_BATCH_SIZE ?? '100', 10);
}
