import type { SubscriptionItemResponse, SubscriptionResponse } from '../types/billing.types';

/**
 * Returns a copy of the subscription with the matching item's displayName updated.
 * Unchanged when the subscription or item is not present.
 */
export function patchSubscriptionItemDisplayName<T extends SubscriptionResponse>(
  subscription: T,
  itemId: string,
  displayName: string | null,
): T {
  const items = subscription.items;

  if (!items?.some((item) => item.id === itemId)) {
    return subscription;
  }

  const nextItems: SubscriptionItemResponse[] = items.map((item) =>
    item.id === itemId ? { ...item, displayName } : item,
  );

  return {
    ...subscription,
    items: nextItems,
  };
}
