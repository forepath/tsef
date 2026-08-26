/**
 * Customer / admin multi-provider selection helpers.
 * Service types own the interchangeable set; plans may further restrict and opt into customer choice.
 */

export const HOST_CLOUD_INIT_COMPATIBILITY_GROUP = 'host-cloud-init';

export interface ProviderCompatibilityInfo {
  id: string;
  compatibilityGroup?: string | null;
}

/**
 * Effective compatibility key for interchange filtering.
 * Missing/empty group ⇒ provider is only compatible with itself.
 */
export function resolveCompatibilityGroup(provider: ProviderCompatibilityInfo): string {
  const group = provider.compatibilityGroup?.trim();

  if (group) {
    return group;
  }

  return `self:${provider.id}`;
}

/**
 * True when two providers may be selected together on one service type.
 */
export function providersAreCompatible(a: ProviderCompatibilityInfo, b: ProviderCompatibilityInfo): boolean {
  return resolveCompatibilityGroup(a) === resolveCompatibilityGroup(b);
}

/**
 * Normalizes allowed provider ids: non-empty strings only, deduplicated, order preserved.
 * First entry is the primary provider.
 */
export function normalizeAllowedProviders(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    if (typeof value !== 'string') continue;

    const trimmed = value.trim();

    if (!trimmed || seen.has(trimmed)) continue;

    seen.add(trimmed);
    out.push(trimmed);
  }

  return out;
}

/**
 * Resolve primary provider from an allowlist (first entry), or null when empty (None).
 */
export function resolvePrimaryProvider(allowedProviders: string[]): string | null {
  const normalized = normalizeAllowedProviders(allowedProviders);

  return normalized[0] ?? null;
}

/**
 * Service type effective allowlist: prefer allowedProviders; fall back to legacy single provider.
 */
export function resolveServiceTypeAllowedProviders(serviceType: {
  provider?: string | null;
  allowedProviders?: string[] | null;
}): string[] {
  const fromList = normalizeAllowedProviders(serviceType.allowedProviders);

  if (fromList.length > 0) {
    return fromList;
  }

  const primary = serviceType.provider?.trim();

  return primary ? [primary] : [];
}

/**
 * Plan effective allowlist:
 * - Customer selection on → plan subset (or full type list if plan list empty).
 * - Customer selection off → plan's pinned provider(s) if set, else the type primary only.
 */
export function resolvePlanAllowedProviders(
  plan: {
    allowCustomerProviderSelection?: boolean | null;
    allowedProviders?: string[] | null;
  },
  serviceType: {
    provider?: string | null;
    allowedProviders?: string[] | null;
  },
): string[] {
  const typeAllowed = resolveServiceTypeAllowedProviders(serviceType);
  const planAllowed = normalizeAllowedProviders(plan.allowedProviders).filter((id) => typeAllowed.includes(id));

  if (plan.allowCustomerProviderSelection === true) {
    if (planAllowed.length === 0) {
      return typeAllowed;
    }

    return planAllowed;
  }

  if (planAllowed.length > 0) {
    return planAllowed;
  }

  return typeAllowed[0] ? [typeAllowed[0]] : [];
}

/**
 * Shallow copy of requestedConfig without provider when customer selection is disabled.
 */
export function stripProviderFromRequestedConfig(
  requestedConfig: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const src = requestedConfig ?? {};
  const out: Record<string, unknown> = { ...src };

  delete out['provider'];

  return out;
}

/**
 * Returns an error message when provider is not in the allowed list, or null when valid.
 */
export function assertProviderAllowed(provider: string, allowedProviders: string[]): string | null {
  const trimmed = provider?.trim();

  if (!trimmed) {
    return 'provider is required';
  }

  if (!Array.isArray(allowedProviders) || allowedProviders.length === 0) {
    return 'No providers are configured for customer selection on this plan';
  }

  if (!allowedProviders.includes(trimmed)) {
    return `provider "${trimmed}" is not allowed for this plan`;
  }

  return null;
}

/**
 * Resolve the effective cloud provider for an order / availability check.
 * Returns null when the service type has no providers (None).
 */
export function resolveEffectiveProvider(
  serviceType: {
    provider?: string | null;
    allowedProviders?: string[] | null;
  },
  plan: {
    allowCustomerProviderSelection?: boolean | null;
    allowedProviders?: string[] | null;
  },
  requestedConfig?: Record<string, unknown> | undefined,
): string | null {
  const allowed = resolvePlanAllowedProviders(plan, serviceType);

  if (allowed.length === 0) {
    return null;
  }

  if (plan.allowCustomerProviderSelection === true) {
    const requested = typeof requestedConfig?.['provider'] === 'string' ? requestedConfig['provider'].trim() : '';

    if (requested) {
      return allowed.includes(requested) ? requested : null;
    }
  }

  return allowed[0] ?? null;
}

/**
 * True when every provider id is registered and all share one compatibility group.
 */
export function assertProvidersCompatible(
  providerIds: string[],
  lookup: (id: string) => ProviderCompatibilityInfo | undefined,
): string | null {
  const normalized = normalizeAllowedProviders(providerIds);

  if (normalized.length === 0) {
    return null;
  }

  const details: ProviderCompatibilityInfo[] = [];

  for (const id of normalized) {
    const detail = lookup(id);

    if (!detail) {
      return `Unknown provider "${id}"`;
    }

    details.push({ id: detail.id, compatibilityGroup: detail.compatibilityGroup });
  }

  const firstGroup = resolveCompatibilityGroup(details[0]);

  for (let i = 1; i < details.length; i++) {
    if (resolveCompatibilityGroup(details[i]) !== firstGroup) {
      return `Providers must share the same compatibility group (incompatible: "${details[0].id}" and "${details[i].id}")`;
    }
  }

  return null;
}

/**
 * Resolve the cloud provider for an existing subscription item.
 * Prefer configSnapshot.provider (customer choice at order), then service type allowlist primary.
 */
export function resolveItemProvider(item: {
  configSnapshot?: Record<string, unknown> | null;
  serviceType?: {
    provider?: string | null;
    allowedProviders?: string[] | null;
  } | null;
}): string | null {
  const fromSnapshot =
    typeof item.configSnapshot?.['provider'] === 'string' ? item.configSnapshot['provider'].trim() : '';

  if (fromSnapshot) {
    return fromSnapshot;
  }

  if (!item.serviceType) {
    return null;
  }

  const allowed = resolveServiceTypeAllowedProviders(item.serviceType);

  return allowed[0] ?? null;
}

/**
 * Compare allowlists for notification change detection (order-sensitive primary).
 */
export function allowedProvidersEqual(a: unknown, b: unknown): boolean {
  const left = normalizeAllowedProviders(a);
  const right = normalizeAllowedProviders(b);

  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}
