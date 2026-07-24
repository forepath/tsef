/**
 * Plan ↔ addon association lives in providerConfigDefaults.allowedAddonIds (string[] of UUIDs).
 */

export function parsePlanAllowedAddonIds(providerConfigDefaults: Record<string, unknown> | undefined): string[] {
  if (!providerConfigDefaults) {
    return [];
  }

  const raw = providerConfigDefaults['allowedAddonIds'];

  if (!Array.isArray(raw)) {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const entry of raw) {
    if (typeof entry !== 'string') {
      continue;
    }

    const id = entry.trim();

    if (!id || seen.has(id)) {
      continue;
    }

    seen.add(id);
    result.push(id);
  }

  return result;
}

export function withPlanAllowedAddonIds(
  providerConfigDefaults: Record<string, unknown> | undefined,
  allowedAddonIds: string[],
): Record<string, unknown> {
  const next = { ...(providerConfigDefaults ?? {}) };
  const unique = parsePlanAllowedAddonIds({ allowedAddonIds });

  if (unique.length === 0) {
    delete next['allowedAddonIds'];
  } else {
    next['allowedAddonIds'] = unique;
  }

  return next;
}

export function planReferencesAddonId(
  providerConfigDefaults: Record<string, unknown> | undefined,
  addonId: string,
): boolean {
  return parsePlanAllowedAddonIds(providerConfigDefaults).includes(addonId);
}
