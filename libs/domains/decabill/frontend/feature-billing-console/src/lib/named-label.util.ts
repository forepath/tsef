/**
 * Human-facing display labels that never fall back to raw UUIDs/ids.
 */

export function getUnavailableLabel(): string {
  return $localize`:@@featureBilling-notAvailable:N/A`;
}

/**
 * Resolve a human-facing label from optional name candidates.
 * Prefer denormalized API names first; use catalog names when available; otherwise N/A.
 */
export function resolveNamedLabel(...candidates: Array<string | null | undefined>): string {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();

    if (trimmed) {
      return trimmed;
    }
  }

  return getUnavailableLabel();
}
