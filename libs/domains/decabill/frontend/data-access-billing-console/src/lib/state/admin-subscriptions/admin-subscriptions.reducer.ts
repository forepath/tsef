import { createReducer, on } from '@ngrx/store';

import type { AdminSubscriptionListItem } from '../../types/billing.types';
import { patchSubscriptionItemDisplayName } from '../../utils/patch-subscription-item-display-name.util';
import { updateDisplayNameSuccess } from '../service-detail/service-detail.actions';

import {
  adminCancelSubscription,
  adminCancelSubscriptionFailure,
  adminCancelSubscriptionSuccess,
  adminResumeSubscription,
  adminResumeSubscriptionFailure,
  adminResumeSubscriptionSuccess,
  adminWithdrawSubscription,
  adminWithdrawSubscriptionFailure,
  adminWithdrawSubscriptionSuccess,
  adminInstantCancelSubscription,
  adminInstantCancelSubscriptionFailure,
  adminInstantCancelSubscriptionSuccess,
  loadAdminSubscriptions,
  loadAdminSubscriptionsFailure,
  loadAdminSubscriptionsSuccess,
  loadMoreAdminSubscriptions,
  loadMoreAdminSubscriptionsFailure,
  loadMoreAdminSubscriptionsSuccess,
} from './admin-subscriptions.actions';

export interface AdminSubscriptionsState {
  subscriptions: AdminSubscriptionListItem[];
  loading: boolean;
  canceling: boolean;
  withdrawing: boolean;
  instantCanceling: boolean;
  resuming: boolean;
  error: string | null;
  hasMore: boolean;
  nextOffset: number;
  appendLoading: boolean;
  appendError: string | null;
  search: string | null;
  userId: string | null;
}

export const initialAdminSubscriptionsState: AdminSubscriptionsState = {
  subscriptions: [],
  loading: false,
  canceling: false,
  withdrawing: false,
  instantCanceling: false,
  resuming: false,
  error: null,
  hasMore: false,
  nextOffset: 0,
  appendLoading: false,
  appendError: null,
  search: null,
  userId: null,
};

function upsertSubscription(
  subscriptions: AdminSubscriptionListItem[],
  updated: AdminSubscriptionListItem,
): AdminSubscriptionListItem[] {
  const index = subscriptions.findIndex((subscription) => subscription.id === updated.id);

  if (index === -1) {
    return subscriptions;
  }

  return subscriptions.map((subscription) => (subscription.id === updated.id ? updated : subscription));
}

export const adminSubscriptionsReducer = createReducer(
  initialAdminSubscriptionsState,
  on(loadAdminSubscriptions, (state, { search, userId }) => ({
    ...state,
    subscriptions: [],
    loading: true,
    error: null,
    appendError: null,
    appendLoading: false,
    hasMore: false,
    nextOffset: 0,
    search: search?.trim() ? search.trim() : null,
    userId: userId ?? null,
  })),
  on(loadAdminSubscriptionsSuccess, (state, { subscriptions, hasMore, nextOffset }) => ({
    ...state,
    subscriptions,
    hasMore,
    nextOffset,
    loading: false,
    error: null,
  })),
  on(loadAdminSubscriptionsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
    hasMore: false,
  })),
  on(loadMoreAdminSubscriptions, (state) => ({
    ...state,
    appendLoading: true,
    appendError: null,
  })),
  on(loadMoreAdminSubscriptionsSuccess, (state, { subscriptions, hasMore, nextOffset }) => ({
    ...state,
    subscriptions: [...state.subscriptions, ...subscriptions],
    hasMore,
    nextOffset,
    appendLoading: false,
    appendError: null,
  })),
  on(loadMoreAdminSubscriptionsFailure, (state, { error }) => ({
    ...state,
    appendLoading: false,
    appendError: error,
  })),
  on(adminCancelSubscription, (state) => ({
    ...state,
    canceling: true,
    error: null,
  })),
  on(adminCancelSubscriptionSuccess, (state, { subscription }) => ({
    ...state,
    canceling: false,
    subscriptions: upsertSubscription(state.subscriptions, subscription),
    error: null,
  })),
  on(adminCancelSubscriptionFailure, (state, { error }) => ({
    ...state,
    canceling: false,
    error,
  })),
  on(adminWithdrawSubscription, (state) => ({
    ...state,
    withdrawing: true,
    error: null,
  })),
  on(adminWithdrawSubscriptionSuccess, (state, { subscription }) => ({
    ...state,
    withdrawing: false,
    subscriptions: upsertSubscription(state.subscriptions, subscription),
    error: null,
  })),
  on(adminWithdrawSubscriptionFailure, (state, { error }) => ({
    ...state,
    withdrawing: false,
    error,
  })),
  on(adminInstantCancelSubscription, (state) => ({
    ...state,
    instantCanceling: true,
    error: null,
  })),
  on(adminInstantCancelSubscriptionSuccess, (state, { subscription }) => ({
    ...state,
    instantCanceling: false,
    subscriptions: upsertSubscription(state.subscriptions, subscription),
    error: null,
  })),
  on(adminInstantCancelSubscriptionFailure, (state, { error }) => ({
    ...state,
    instantCanceling: false,
    error,
  })),
  on(adminResumeSubscription, (state) => ({
    ...state,
    resuming: true,
    error: null,
  })),
  on(adminResumeSubscriptionSuccess, (state, { subscription }) => ({
    ...state,
    resuming: false,
    subscriptions: upsertSubscription(state.subscriptions, subscription),
    error: null,
  })),
  on(adminResumeSubscriptionFailure, (state, { error }) => ({
    ...state,
    resuming: false,
    error,
  })),
  on(updateDisplayNameSuccess, (state, { subscriptionId, itemId, displayName }) => ({
    ...state,
    subscriptions: state.subscriptions.map((subscription) =>
      subscription.id === subscriptionId
        ? patchSubscriptionItemDisplayName(subscription, itemId, displayName)
        : subscription,
    ),
  })),
);
