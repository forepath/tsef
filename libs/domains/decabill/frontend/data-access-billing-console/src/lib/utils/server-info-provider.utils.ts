import {
  formatProvisioningLocationLabel,
  providerLocationCatalogFromList,
  type ProviderLocationCatalog,
} from '@forepath/shared/frontend/util-provisioning-geography';

import type { ServerInfoResponse } from '../types/billing.types';

export type BillingServerInfoProvider = 'hetzner' | 'digital-ocean';

/**
 * Resolves provisioning provider from server-info metadata (set by billing-manager).
 */
export function resolveServerInfoProvider(metadata?: Record<string, unknown>): BillingServerInfoProvider | undefined {
  const raw = metadata?.['provider'];

  if (raw === 'digital-ocean' || raw === 'digitalocean') {
    return 'digital-ocean';
  }

  if (raw === 'hetzner') {
    return 'hetzner';
  }

  return undefined;
}

/**
 * Hetzner: online when status is `running`.
 * DigitalOcean: online when status is `active`.
 * Unknown provider: treat either `running` or `active` as online (safe default).
 */
export function isBillingServerOnline(serverInfo: Pick<ServerInfoResponse, 'status' | 'metadata'>): boolean {
  const provider = resolveServerInfoProvider(serverInfo.metadata);

  if (provider === 'digital-ocean') {
    return serverInfo.status === 'active';
  }

  if (provider === 'hetzner') {
    return serverInfo.status === 'running';
  }

  return serverInfo.status === 'running' || serverInfo.status === 'active';
}

/**
 * Hetzner: powered off when `off`.
 * DigitalOcean: `off` or `archive` (not accepting traffic).
 */
export function isBillingServerOff(serverInfo: Pick<ServerInfoResponse, 'status' | 'metadata'>): boolean {
  const provider = resolveServerInfoProvider(serverInfo.metadata);

  if (provider === 'digital-ocean') {
    return serverInfo.status === 'off' || serverInfo.status === 'archive';
  }

  return serverInfo.status === 'off';
}

/**
 * True when the status badge shows the hourglass — neither clearly online nor off (e.g. transitioning).
 */
export function isBillingServerStatusTransitional(
  serverInfo: Pick<ServerInfoResponse, 'status' | 'metadata'>,
): boolean {
  return !isBillingServerOnline(serverInfo) && !isBillingServerOff(serverInfo);
}

/**
 * Whether the UI may offer "start" (power on). Archive droplets are not startable from this flow.
 */
export function isBillingServerStartable(serverInfo: Pick<ServerInfoResponse, 'status' | 'metadata'>): boolean {
  return serverInfo.status === 'off';
}

function trimMetadataString(metadata: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = metadata?.[key];

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed || undefined;
}

/**
 * Location/datacenter label for the UI.
 * Prefers provider-supplied human-readable metadata (`locationName`, `regionName`),
 * then maps geography slugs (`location`, `region`) via catalog and static provider labels.
 * Returns undefined when no human-readable label is available (caller should hide the row).
 */
export function getBillingServerLocationLabel(
  metadata?: Record<string, unknown>,
  locations?: ProviderLocationCatalog | Array<{ id: string; name: string }>,
): string | undefined {
  const humanName = trimMetadataString(metadata, 'locationName') ?? trimMetadataString(metadata, 'regionName');

  if (humanName) {
    return humanName;
  }

  const slug = trimMetadataString(metadata, 'location') ?? trimMetadataString(metadata, 'region');

  if (!slug) {
    return undefined;
  }

  const resolved = formatProvisioningLocationLabel(slug, locations, resolveServerInfoProvider(metadata));

  // Hide unresolved technical slugs from the UI.
  if (!resolved || resolved === slug) {
    return undefined;
  }

  return resolved;
}

/**
 * Formats a geography slug using a provider location catalog for dropdowns and summaries.
 */
export function formatBillingProviderLocationLabel(
  slug: string | null | undefined,
  locations?: ProviderLocationCatalog | Array<{ id: string; name: string }>,
  providerId?: string | null,
): string {
  return formatProvisioningLocationLabel(slug, locations, providerId);
}

export { providerLocationCatalogFromList, type ProviderLocationCatalog };

/**
 * Optimistic status after a successful start action (reducer).
 */
export function billingOptimisticOnlineStatus(metadata?: Record<string, unknown>): string {
  return resolveServerInfoProvider(metadata) === 'digital-ocean' ? 'active' : 'running';
}
