/**
 * Human-facing display labels that never fall back to raw UUIDs/ids.
 */

export function getUnavailableDisplayLabel(): string {
  return $localize`:@@featureAgentConsole-notAvailable:N/A`;
}

export function resolveNamedDisplayLabel(...candidates: Array<string | null | undefined>): string {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();

    if (trimmed) {
      return trimmed;
    }
  }

  return getUnavailableDisplayLabel();
}
