export interface AddonProviderCompatibility {
  compatibleProviders: string[];
}

/**
 * Empty compatibleProviders means the addon works with all addon-capable providers.
 */
export function isAddonCompatibleWithProvider(
  addon: AddonProviderCompatibility,
  providerId: string | null | undefined,
): boolean {
  const trimmed = providerId?.trim();

  if (!trimmed) {
    return addon.compatibleProviders.length === 0;
  }

  return addon.compatibleProviders.length === 0 || addon.compatibleProviders.includes(trimmed);
}
