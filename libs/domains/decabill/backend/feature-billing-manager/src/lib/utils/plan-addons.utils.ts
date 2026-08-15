/**
 * Plan ↔ addon association lives in providerConfigDefaults:
 * - allowedAddonIds: string[] of UUIDs (customer-selectable)
 * - mandatoryAddonIds: string[] of UUIDs (subset of allowed; always activated)
 */

import { resolvePlanProvisioningOptions } from './cloud-init/plan-provisioning-options.utils';

export const CONTAINER_MANAGER_ADDON_KEY = 'container-manager';
export const CONTAINER_MANAGER_MODULE_KEY = 'container-manager';

function parseUuidIdArray(providerConfigDefaults: Record<string, unknown> | undefined, key: string): string[] {
  if (!providerConfigDefaults) {
    return [];
  }

  const raw = providerConfigDefaults[key];

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

export function parsePlanAllowedAddonIds(providerConfigDefaults: Record<string, unknown> | undefined): string[] {
  return parseUuidIdArray(providerConfigDefaults, 'allowedAddonIds');
}

export function parsePlanMandatoryAddonIds(providerConfigDefaults: Record<string, unknown> | undefined): string[] {
  return parseUuidIdArray(providerConfigDefaults, 'mandatoryAddonIds');
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

export function withPlanMandatoryAddonIds(
  providerConfigDefaults: Record<string, unknown> | undefined,
  mandatoryAddonIds: string[],
): Record<string, unknown> {
  const next = { ...(providerConfigDefaults ?? {}) };
  const allowed = new Set(parsePlanAllowedAddonIds(next));
  const unique = parsePlanMandatoryAddonIds({ mandatoryAddonIds }).filter((id) => allowed.has(id));

  if (unique.length === 0) {
    delete next['mandatoryAddonIds'];
  } else {
    next['mandatoryAddonIds'] = unique;
  }

  return next;
}

/**
 * Ensures mandatory IDs are a subset of allowed. Drops orphans from mandatory.
 * Call after both arrays are written.
 */
export function reconcilePlanAddonIdLists(
  providerConfigDefaults: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const next = { ...(providerConfigDefaults ?? {}) };
  const allowed = parsePlanAllowedAddonIds(next);
  const mandatory = parsePlanMandatoryAddonIds(next).filter((id) => allowed.includes(id));

  if (allowed.length === 0) {
    delete next['allowedAddonIds'];
  } else {
    next['allowedAddonIds'] = allowed;
  }

  if (mandatory.length === 0) {
    delete next['mandatoryAddonIds'];
  } else {
    next['mandatoryAddonIds'] = mandatory;
  }

  return next;
}

export function planReferencesAddonId(
  providerConfigDefaults: Record<string, unknown> | undefined,
  addonId: string,
): boolean {
  return parsePlanAllowedAddonIds(providerConfigDefaults).includes(addonId);
}

export function planHasMandatoryAddonId(
  providerConfigDefaults: Record<string, unknown> | undefined,
  addonId: string,
): boolean {
  return parsePlanMandatoryAddonIds(providerConfigDefaults).includes(addonId);
}

/** True when the plan offers at least one integrated (Docker-host) stack option. */
export function planHasIntegratedProvisioning(providerConfigDefaults: Record<string, unknown> | undefined): boolean {
  return resolvePlanProvisioningOptions(providerConfigDefaults).some((option) => option.type === 'integrated');
}

/**
 * Server-authoritative merge: mandatory plan addons are always included regardless of client payload.
 * Mandatory IDs outside the plan's allowed list are ignored (stale config must not break orders).
 */
export function mergeOrderAddonIds(
  requestedAddonIds: string[] | undefined,
  providerConfigDefaults: Record<string, unknown> | undefined,
): string[] {
  const allowed = new Set(parsePlanAllowedAddonIds(providerConfigDefaults));
  const mandatory = parsePlanMandatoryAddonIds(providerConfigDefaults).filter((id) => allowed.has(id));
  const requested = [...new Set((requestedAddonIds ?? []).filter(Boolean))];
  const seen = new Set<string>();
  const result: string[] = [];

  for (const id of [...mandatory, ...requested]) {
    if (!id || seen.has(id)) {
      continue;
    }

    seen.add(id);
    result.push(id);
  }

  return result;
}

export function ensureAddonIdInPlanLists(
  providerConfigDefaults: Record<string, unknown> | undefined,
  addonId: string,
  options?: { mandatory?: boolean },
): Record<string, unknown> {
  let next = withPlanAllowedAddonIds(providerConfigDefaults, [
    ...parsePlanAllowedAddonIds(providerConfigDefaults),
    addonId,
  ]);

  if (options?.mandatory) {
    next = withPlanMandatoryAddonIds(next, [...parsePlanMandatoryAddonIds(next), addonId]);
  }

  return reconcilePlanAddonIdLists(next);
}
