import { SubscriptionStatus } from '../entities/subscription.entity';

/**
 * Subscription statuses where a live provisioned service may still be opened,
 * controlled, or shown on the customer dashboard until deprovisioned.
 */
export const LIVE_ACCESSIBLE_SUBSCRIPTION_STATUSES: ReadonlySet<SubscriptionStatus> = new Set([
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.PENDING_CANCEL,
  SubscriptionStatus.PENDING_WITHDRAWAL,
  SubscriptionStatus.PENDING_INSTANT_CANCEL,
  SubscriptionStatus.PENDING_CONFIG_CHANGE,
  SubscriptionStatus.PENDING_BACKORDER,
]);

export function isLiveAccessibleSubscriptionStatus(status: SubscriptionStatus): boolean {
  return LIVE_ACCESSIBLE_SUBSCRIPTION_STATUSES.has(status);
}
