import type { SubscriptionResponse } from '@forepath/decabill/frontend/data-access-billing-console';

import { resolveNamedLabel } from './named-label.util';

export function getBillingAdminSubscriptionPrimaryLabel(subscription: SubscriptionResponse): string {
  const number = subscription.number?.trim();

  if (number) {
    return number;
  }

  return resolveNamedLabel(subscription.planName);
}

export function getBillingAdminSubscriptionPlanLabel(subscription: SubscriptionResponse): string {
  return resolveNamedLabel(subscription.planName);
}

export function filterBillingAdminSubscriptions(
  subscriptions: SubscriptionResponse[],
  query: string,
  limit = 20,
): SubscriptionResponse[] {
  const term = query.trim().toLowerCase();
  const filtered = term
    ? subscriptions.filter((subscription) => {
        const haystack = [
          subscription.id,
          subscription.number,
          subscription.planId,
          subscription.planName,
          subscription.status,
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(term);
      })
    : subscriptions;

  return filtered.slice(0, limit);
}
