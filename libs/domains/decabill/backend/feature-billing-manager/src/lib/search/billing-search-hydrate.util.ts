import type { ObjectLiteral, Repository } from 'typeorm';
import { In } from 'typeorm';

import type { BillingSearchIdsLookup } from './billing-search.types';

/**
 * Hydrate TypeORM entities in OpenSearch hit order.
 * Returns null when lookup was skipped or empty (caller should fall back to SQL ILIKE) —
 * empty OS hits cover unindexed data and analyzer gaps (e.g. numeric partial matches).
 * When total > 0 but ids are empty (offset past the end), returns an empty page.
 */
export async function hydrateEntitiesBySearchIds<T extends ObjectLiteral & { id: string }>(
  repository: Repository<T>,
  lookup: BillingSearchIdsLookup,
): Promise<{ items: T[]; total: number } | null> {
  if (!lookup) {
    return null;
  }

  if (lookup.ids.length === 0) {
    if (lookup.total === 0) {
      return null;
    }

    return { items: [], total: lookup.total };
  }

  const found = await repository.findBy({ id: In(lookup.ids) } as never);
  const byId = new Map((found as T[]).map((item) => [item.id, item]));
  const items = lookup.ids.map((id) => byId.get(id)).filter((item): item is T => item != null);

  return { items, total: lookup.total };
}
