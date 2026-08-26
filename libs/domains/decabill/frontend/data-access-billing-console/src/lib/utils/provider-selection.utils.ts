/**
 * Frontend helpers for Decabill multi-provider selection.
 * Semantics mirror backend `provider-selection.utils`.
 */

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
  if (!Array.isArray(values)) {
    return [];
  }

  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    if (typeof value !== 'string') {
      continue;
    }

    const trimmed = value.trim();

    if (!trimmed || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    out.push(trimmed);
  }

  return out;
}
