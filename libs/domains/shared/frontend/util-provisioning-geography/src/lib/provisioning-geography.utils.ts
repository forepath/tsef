import { getProviderLocationFallbackLabels } from './provider-location-fallbacks';

export interface ProviderLocation {
  id: string;
  name: string;
  city?: string;
  country?: string;
}

export type ProviderLocationCatalog = Map<string, ProviderLocation>;

export function providerLocationCatalogFromList(locations: ProviderLocation[]): ProviderLocationCatalog {
  const catalog = new Map<string, ProviderLocation>();

  for (const location of locations) {
    const id = location.id?.trim();

    if (id) {
      catalog.set(id, location);
    }
  }

  return catalog;
}

/**
 * Formats a geography slug for display using a loaded provider catalog and static fallbacks.
 * Returns an empty string when no slug is provided.
 */
export function formatProvisioningLocationLabel(
  slug: string | null | undefined,
  catalog?: ProviderLocationCatalog | ProviderLocation[],
  providerId?: string | null,
): string {
  const normalizedSlug = slug?.trim();

  if (!normalizedSlug) {
    return '';
  }

  if (catalog) {
    const entry =
      catalog instanceof Map ? catalog.get(normalizedSlug) : catalog.find((location) => location.id === normalizedSlug);

    if (entry?.name?.trim()) {
      return entry.name.trim();
    }
  }

  if (providerId?.trim()) {
    const fallback = getProviderLocationFallbackLabels(providerId.trim())[normalizedSlug];

    if (fallback?.trim()) {
      return fallback.trim();
    }
  }

  return normalizedSlug;
}
