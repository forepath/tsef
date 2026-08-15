import type { ProvisioningStatus, SubscriptionStatus } from '../types/billing.types';

export type SubscriptionItemProvisioningDisplayStatus = ProvisioningStatus | 'removing' | 'removed';

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

/** Subscription statuses where a live service may still be opened / controlled / shown on overview. */
export const LIVE_ACCESSIBLE_SUBSCRIPTION_STATUSES: ReadonlySet<SubscriptionStatus> = new Set([
  'active',
  'pending_cancel',
  'pending_withdrawal',
  'pending_instant_cancel',
  'pending_config_change',
  'pending_backorder',
]);

export function isLiveAccessibleSubscriptionStatus(status: SubscriptionStatus | string | null | undefined): boolean {
  if (status == null || status === '') {
    return false;
  }

  return LIVE_ACCESSIBLE_SUBSCRIPTION_STATUSES.has(status as SubscriptionStatus);
}

const PENDING_TEARDOWN_SUBSCRIPTION_STATUSES: ReadonlySet<string> = new Set([
  'pending_withdrawal',
  'pending_instant_cancel',
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
    !isLiveAccessibleSubscriptionStatus(subscriptionStatus)
  ) {
    return false;
  }

  return item.provisioningStatus === 'active' && hasLiveProviderReference(item);
}

/**
 * Derived provisioning badge for subscription list items.
 * Pending teardown stays "removing" until the subscription is canceled or the provider ref is cleared.
 */
export function resolveSubscriptionItemProvisioningDisplayStatus(
  item: {
    provisioningStatus: ProvisioningStatus;
    hasProviderReference?: boolean;
    hostname?: string | null;
  },
  subscriptionStatus?: SubscriptionStatus | string | null,
): SubscriptionItemProvisioningDisplayStatus {
  if (subscriptionStatus === 'canceled') {
    return 'removed';
  }

  if (
    subscriptionStatus != null &&
    PENDING_TEARDOWN_SUBSCRIPTION_STATUSES.has(subscriptionStatus) &&
    hasLiveProviderReference(item)
  ) {
    return 'removing';
  }

  if (item.provisioningStatus === 'failed') {
    return 'failed';
  }

  if (item.provisioningStatus === 'active' && !hasLiveProviderReference(item)) {
    return 'removed';
  }

  // Pending teardown without a live provider ref has already been torn down.
  if (subscriptionStatus != null && PENDING_TEARDOWN_SUBSCRIPTION_STATUSES.has(subscriptionStatus)) {
    return 'removed';
  }

  return item.provisioningStatus;
}

/**
 * Derived Removed UI state: terminal canceled subscription, or active item without a live
 * provider reference after teardown. Pending withdrawal/instant-cancel are not removed yet.
 */
export function isSubscriptionItemRemoved(
  item: {
    provisioningStatus: ProvisioningStatus;
    hasProviderReference?: boolean;
    hostname?: string | null;
  },
  subscriptionStatus?: SubscriptionStatus | string | null,
): boolean {
  return resolveSubscriptionItemProvisioningDisplayStatus(item, subscriptionStatus) === 'removed';
}
