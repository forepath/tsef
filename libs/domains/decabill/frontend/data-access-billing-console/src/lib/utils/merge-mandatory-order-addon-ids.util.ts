import type { PlanAddonOptionDto } from '../types/billing.types';

/**
 * Ensures mandatory plan addons stay selected alongside any customer selection.
 */
export function mergeMandatoryOrderAddonIds(selected: Iterable<string>, options: PlanAddonOptionDto[]): string[] {
  const mandatoryIds = options.filter((addon) => addon.mandatory).map((addon) => addon.id);
  const seen = new Set<string>();
  const result: string[] = [];

  for (const id of [...mandatoryIds, ...selected]) {
    if (!id || seen.has(id)) {
      continue;
    }

    seen.add(id);
    result.push(id);
  }

  return result;
}
