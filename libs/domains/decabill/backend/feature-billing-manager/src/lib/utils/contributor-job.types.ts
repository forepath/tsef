export type ContributorJobSource = 'addon' | 'integrated' | 'cloud-init';

export interface ContributorJobContext {
  tenantId: string;
  now: Date;
  source: ContributorJobSource;
  sourceKey: string;
}

export interface ContributorJobDefinition {
  /** Stable slug unique within `(source, sourceKey)`. */
  readonly key: string;
  /** Target period between successful runs; clamped to 15s–24h. */
  readonly intervalMs: number;
  readonly isEnabled?: () => boolean;
  run(ctx: ContributorJobContext): Promise<void>;
}

export interface RegisteredContributorJob {
  source: ContributorJobSource;
  sourceKey: string;
  definition: ContributorJobDefinition;
}

export const CONTRIBUTOR_JOB_MIN_INTERVAL_MS = 15_000;
export const CONTRIBUTOR_JOB_MAX_INTERVAL_MS = 86_400_000;
export const CONTRIBUTOR_JOB_KEY_PATTERN = /^[a-z][a-z0-9-]{0,63}$/;
export const RESERVED_CONTRIBUTOR_JOB_KEYS = new Set(['coordinator', 'unit']);

export function clampContributorJobIntervalMs(intervalMs: number): number {
  if (!Number.isFinite(intervalMs)) {
    return CONTRIBUTOR_JOB_MIN_INTERVAL_MS;
  }

  const truncated = Math.trunc(intervalMs);

  if (truncated < CONTRIBUTOR_JOB_MIN_INTERVAL_MS) {
    return CONTRIBUTOR_JOB_MIN_INTERVAL_MS;
  }

  if (truncated > CONTRIBUTOR_JOB_MAX_INTERVAL_MS) {
    return CONTRIBUTOR_JOB_MAX_INTERVAL_MS;
  }

  return truncated;
}

export function sanitizeContributorJobDefinition(definition: ContributorJobDefinition): ContributorJobDefinition {
  const key = definition.key?.trim() ?? '';

  if (!CONTRIBUTOR_JOB_KEY_PATTERN.test(key)) {
    throw new Error('Invalid contributor job key');
  }

  if (RESERVED_CONTRIBUTOR_JOB_KEYS.has(key)) {
    throw new Error('Reserved contributor job key');
  }

  if (typeof definition.run !== 'function') {
    throw new Error('Contributor job run handler is required');
  }

  if (definition.isEnabled !== undefined && typeof definition.isEnabled !== 'function') {
    throw new Error('Contributor job isEnabled must be a function');
  }

  return {
    key,
    intervalMs: clampContributorJobIntervalMs(definition.intervalMs),
    isEnabled: definition.isEnabled,
    run: definition.run,
  };
}
