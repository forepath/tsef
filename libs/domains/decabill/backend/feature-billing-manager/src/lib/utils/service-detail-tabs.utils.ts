import { BadRequestException } from '@nestjs/common';

/** Shared service-detail tab contribution used by addons, integrated stacks, and CloudInit. */
export interface ServiceTabDefinition {
  /** Stable tab id (also used in routes / frontend registry). */
  readonly id: string;
  /** Customer-facing label. */
  readonly label: string;
  /** Lower sorts first; Details tab is always 0. */
  readonly order: number;
  /**
   * Optional visibility rule. When omitted, the tab is shown whenever the contributor is active.
   * Returning false hides the tab even if the contributor is active.
   */
  readonly isVisible?: (ctx: { subscriptionId: string; itemId: string }) => boolean;
}

/** Persisted CloudInit config tab metadata (no functions; admin CRUD only). */
export interface CloudInitConfigServiceTabDefinition {
  id: string;
  label: string;
  order: number;
}

export type ServiceDetailTabSource = 'details' | 'addon' | 'integrated' | 'cloud-init';

export interface ResolvedServiceDetailTab {
  id: string;
  label: string;
  order: number;
  /** Contributor key: addon moduleKey, integrated service id, or cloud-init config key; null for Details. */
  moduleKey: string | null;
  source: ServiceDetailTabSource;
}

const TAB_ID_PATTERN = /^[a-z][a-z0-9-]{0,63}$/;
const MAX_CLOUD_INIT_SERVICE_TABS = 20;
/** Tab ids owned by first-party surfaces; CloudInit declarative tabs must not collide. */
const RESERVED_SERVICE_TAB_IDS = new Set(['details', 'container-manager']);

export function createDetailsTab(): ResolvedServiceDetailTab {
  return { id: 'details', label: 'Details', order: 0, moduleKey: null, source: 'details' };
}

/**
 * Appends contributor tabs onto an existing list, skipping duplicates by id and applying visibility.
 */
export function appendServiceTabs(
  tabs: ResolvedServiceDetailTab[],
  definitions: readonly ServiceTabDefinition[] | undefined,
  source: Exclude<ServiceDetailTabSource, 'details'>,
  sourceKey: string,
  ctx: { subscriptionId: string; itemId: string },
): void {
  for (const tab of definitions ?? []) {
    const visible = tab.isVisible?.(ctx) ?? true;

    if (!visible) {
      continue;
    }

    if (tabs.some((existing) => existing.id === tab.id)) {
      continue;
    }

    tabs.push({
      id: tab.id,
      label: tab.label,
      order: tab.order,
      moduleKey: sourceKey,
      source,
    });
  }
}

export function sortResolvedServiceTabs(tabs: ResolvedServiceDetailTab[]): ResolvedServiceDetailTab[] {
  return [...tabs].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

/**
 * Validates and normalizes declarative CloudInit service tab metadata for persistence.
 */
export function sanitizeCloudInitServiceTabs(
  raw: CloudInitConfigServiceTabDefinition[] | undefined,
): CloudInitConfigServiceTabDefinition[] {
  if (!raw?.length) {
    return [];
  }

  if (raw.length > MAX_CLOUD_INIT_SERVICE_TABS) {
    throw new BadRequestException(`CloudInit configs may declare at most ${MAX_CLOUD_INIT_SERVICE_TABS} service tabs`);
  }

  const seen = new Set<string>();
  const result: CloudInitConfigServiceTabDefinition[] = [];

  for (const entry of raw) {
    const id = typeof entry?.id === 'string' ? entry.id.trim() : '';
    const label = typeof entry?.label === 'string' ? entry.label.trim() : '';
    const order = typeof entry?.order === 'number' && Number.isFinite(entry.order) ? Math.trunc(entry.order) : NaN;

    if (!id || !label || Number.isNaN(order)) {
      throw new BadRequestException('Each service tab requires a non-empty id, label, and numeric order');
    }

    if (RESERVED_SERVICE_TAB_IDS.has(id)) {
      throw new BadRequestException(`serviceTabs must not use the reserved id "${id}"`);
    }

    if (!TAB_ID_PATTERN.test(id)) {
      throw new BadRequestException(
        `Invalid service tab id "${id}": must match ${TAB_ID_PATTERN.source} (lowercase slug, max 64 chars)`,
      );
    }

    if (label.length > 100) {
      throw new BadRequestException(`Service tab label for "${id}" exceeds 100 characters`);
    }

    if (seen.has(id)) {
      throw new BadRequestException(`Duplicate service tab id: ${id}`);
    }

    seen.add(id);
    result.push({ id, label, order });
  }

  return result;
}
