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

export function partitionAddonsByProviderCompatibility<T extends AddonProviderCompatibility>(
  addons: T[],
  providerId: string | null | undefined,
): { compatible: T[]; incompatible: T[] } {
  const compatible: T[] = [];
  const incompatible: T[] = [];

  for (const addon of addons) {
    if (isAddonCompatibleWithProvider(addon, providerId)) {
      compatible.push(addon);
    } else {
      incompatible.push(addon);
    }
  }

  return { compatible, incompatible };
}
