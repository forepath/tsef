import type { ProvisioningStatus, SubscriptionStatus } from '../types/billing.types';

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

/** Subscription statuses where a live service may still be opened / controlled. */
const SERVICE_DETAIL_ACCESSIBLE_SUBSCRIPTION_STATUSES: ReadonlySet<SubscriptionStatus> = new Set([
  'active',
  'pending_cancel',
  'pending_config_change',
  'pending_backorder',
]);

function hasLiveProviderReference(item: { hasProviderReference?: boolean; hostname?: string | null }): boolean {
  if (typeof item.hasProviderReference === 'boolean') {
    return item.hasProviderReference;
  }

  // Legacy list payloads omitted the flag; hostname was the prior proxy.
  return !!item.hostname?.trim();
}

/**
 * Whether a subscription list item can open the service detail view.
 * Requires an accessible parent subscription, active provisioning, and a live provider reference.
 */
export function isSubscriptionItemDetailEligible(
  item: {
    provisioningStatus: ProvisioningStatus;
    hasProviderReference?: boolean;
    hostname?: string | null;
  },
  subscriptionStatus?: SubscriptionStatus | string | null,
): boolean {
  if (
    subscriptionStatus != null &&
    subscriptionStatus !== '' &&
    !SERVICE_DETAIL_ACCESSIBLE_SUBSCRIPTION_STATUSES.has(subscriptionStatus as SubscriptionStatus)
  ) {
    return false;
  }

  return item.provisioningStatus === 'active' && hasLiveProviderReference(item);
}

/**
 * Derived Removed UI state: terminal/teardown subscription, failed provisioning,
 * or active item without a live provider reference after teardown.
 */
export function isSubscriptionItemRemoved(
  item: {
    provisioningStatus: ProvisioningStatus;
    hasProviderReference?: boolean;
    hostname?: string | null;
  },
  subscriptionStatus?: SubscriptionStatus | string | null,
): boolean {
  if (
    subscriptionStatus === 'canceled' ||
    subscriptionStatus === 'pending_withdrawal' ||
    subscriptionStatus === 'pending_instant_cancel'
  ) {
    return true;
  }

  if (item.provisioningStatus === 'failed') {
    return true;
  }

  return item.provisioningStatus === 'active' && !hasLiveProviderReference(item);
}
