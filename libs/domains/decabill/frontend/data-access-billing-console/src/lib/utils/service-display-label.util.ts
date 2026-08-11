import type { ProvisioningStatus } from '../types/billing.types';

export function resolveServiceDisplayLabel(item: {
  displayName?: string | null;
  serviceTypeName?: string | null;
  service?: string | null;
}): string {
  const trimmedDisplayName = item.displayName?.trim();

  if (trimmedDisplayName) {
    return trimmedDisplayName;
  }

  const trimmedServiceTypeName = item.serviceTypeName?.trim();

  if (trimmedServiceTypeName) {
    return trimmedServiceTypeName;
  }

  const trimmedService = item.service?.trim();

  if (trimmedService) {
    return trimmedService;
  }

  return 'Service';
}

/**
 * Whether a subscription list item can open the service detail view.
 * Backend detail endpoints require active status and a provider reference.
 * List responses omit providerReference; active status plus hostname approximates that gate
 * because teardown clears hostname when the provider resource is removed.
 */
export function isSubscriptionItemDetailEligible(item: {
  provisioningStatus: ProvisioningStatus;
  hostname?: string | null;
}): boolean {
  return item.provisioningStatus === 'active' && !!item.hostname?.trim();
}

/** Failed provisioning or active items torn down (hostname cleared, status may stay active). */
export function isSubscriptionItemRemoved(item: {
  provisioningStatus: ProvisioningStatus;
  hostname?: string | null;
}): boolean {
  if (item.provisioningStatus === 'failed') {
    return true;
  }

  return item.provisioningStatus === 'active' && !item.hostname?.trim();
}
