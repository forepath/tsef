import { createReducer, on } from '@ngrx/store';

import type { ListParams, SubscriptionResponse } from '../../types/billing.types';
import { patchSubscriptionItemDisplayName } from '../../utils/patch-subscription-item-display-name.util';
import { updateDisplayNameSuccess } from '../service-detail/service-detail.actions';

import {
  cancelSubscription,
  cancelSubscriptionFailure,
  cancelSubscriptionSuccess,
  clearSelectedSubscription,
  createSubscription,
  createSubscriptionFailure,
  createSubscriptionSuccess,
  loadSubscription,
  loadSubscriptionFailure,
  loadSubscriptions,
  loadSubscriptionsFailure,
  loadSubscriptionsSuccess,
  loadSubscriptionSuccess,
  loadMoreSubscriptions,
  loadMoreSubscriptionsFailure,
  loadMoreSubscriptionsSuccess,
  resumeSubscription,
  resumeSubscriptionFailure,
  resumeSubscriptionSuccess,
  withdrawSubscription,
  withdrawSubscriptionFailure,
  withdrawSubscriptionSuccess,
} from './subscriptions.actions';

export interface SubscriptionsState {
  entities: SubscriptionResponse[];
  selectedSubscription: SubscriptionResponse | null;
  loading: boolean;
  loadingSubscription: boolean;
  creating: boolean;
  canceling: boolean;
  withdrawing: boolean;
  resuming: boolean;
  error: string | null;
  hasMore: boolean;
  nextOffset: number;
  appendLoading: boolean;
  appendError: string | null;
  listParams: ListParams | null;
}

export const initialSubscriptionsState: SubscriptionsState = {
  entities: [],
  selectedSubscription: null,
  loading: false,
  loadingSubscription: false,
  creating: false,
  canceling: false,
  withdrawing: false,
  resuming: false,
  error: null,
  hasMore: false,
  nextOffset: 0,
  appendLoading: false,
  appendError: null,
  listParams: null,
};

export const subscriptionsReducer = createReducer(
  initialSubscriptionsState,
  on(loadSubscriptions, (state, { params }) => ({
    ...state,
    entities: [],
    loading: true,
    error: null,
    appendError: null,
    appendLoading: false,
    hasMore: false,
    nextOffset: 0,
    listParams: params ?? null,
  })),
  on(loadSubscriptionsSuccess, (state, { subscriptions, hasMore, nextOffset }) => ({
    ...state,
    entities: subscriptions,
    hasMore,
    nextOffset,
    loading: false,
    error: null,
  })),
  on(loadSubscriptionsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
    hasMore: false,
  })),
  on(loadMoreSubscriptions, (state) => ({
    ...state,
    appendLoading: true,
    appendError: null,
  })),
  on(loadMoreSubscriptionsSuccess, (state, { subscriptions, hasMore, nextOffset }) => ({
    ...state,
    entities: [...state.entities, ...subscriptions],
    hasMore,
    nextOffset,
    appendLoading: false,
    appendError: null,
  })),
  on(loadMoreSubscriptionsFailure, (state, { error }) => ({
    ...state,
    appendLoading: false,
    appendError: error,
  })),
  on(loadSubscription, (state) => ({
    ...state,
    loadingSubscription: true,
    error: null,
  })),
  on(loadSubscriptionSuccess, (state, { subscription }) => {
    const existingIndex = state.entities.findIndex((s) => s.id === subscription.id);
    const entities =
      existingIndex >= 0
        ? state.entities.map((s) => (s.id === subscription.id ? subscription : s))
        : [...state.entities, subscription];

    return {
      ...state,
      entities,
      selectedSubscription: subscription,
      loadingSubscription: false,
      error: null,
    };
  }),
  on(loadSubscriptionFailure, (state, { error }) => ({
    ...state,
    loadingSubscription: false,
    error,
  })),
  on(createSubscription, (state) => ({
    ...state,
    creating: true,
    error: null,
  })),
  on(createSubscriptionSuccess, (state, { subscription }) => ({
    ...state,
    entities: [subscription, ...state.entities],
    selectedSubscription: subscription,
    creating: false,
    error: null,
  })),
  on(createSubscriptionFailure, (state, { error }) => ({
    ...state,
    creating: false,
    error,
  })),
  on(cancelSubscription, (state) => ({
    ...state,
    canceling: true,
    error: null,
  })),
  on(cancelSubscriptionSuccess, (state, { subscription }) => ({
    ...state,
    entities: state.entities.map((s) => (s.id === subscription.id ? subscription : s)),
    selectedSubscription:
      state.selectedSubscription?.id === subscription.id ? subscription : state.selectedSubscription,
    canceling: false,
    error: null,
  })),
  on(cancelSubscriptionFailure, (state, { error }) => ({
    ...state,
    canceling: false,
    error,
  })),
  on(withdrawSubscription, (state) => ({
    ...state,
    withdrawing: true,
    error: null,
  })),
  on(withdrawSubscriptionSuccess, (state, { subscription }) => ({
    ...state,
    entities: state.entities.map((s) => (s.id === subscription.id ? subscription : s)),
    selectedSubscription:
      state.selectedSubscription?.id === subscription.id ? subscription : state.selectedSubscription,
    withdrawing: false,
    error: null,
  })),
  on(withdrawSubscriptionFailure, (state, { error }) => ({
    ...state,
    withdrawing: false,
    error,
  })),
  on(resumeSubscription, (state) => ({
    ...state,
    resuming: true,
    error: null,
  })),
  on(resumeSubscriptionSuccess, (state, { subscription }) => ({
    ...state,
    entities: state.entities.map((s) => (s.id === subscription.id ? subscription : s)),
    selectedSubscription:
      state.selectedSubscription?.id === subscription.id ? subscription : state.selectedSubscription,
    resuming: false,
    error: null,
  })),
  on(resumeSubscriptionFailure, (state, { error }) => ({
    ...state,
    resuming: false,
    error,
  })),
  on(updateDisplayNameSuccess, (state, { subscriptionId, itemId, displayName }) => {
    const patchOne = (subscription: SubscriptionResponse): SubscriptionResponse =>
      subscription.id === subscriptionId
        ? patchSubscriptionItemDisplayName(subscription, itemId, displayName)
        : subscription;

    return {
      ...state,
      entities: state.entities.map(patchOne),
      selectedSubscription: state.selectedSubscription
        ? patchOne(state.selectedSubscription)
        : state.selectedSubscription,
    };
  }),
  on(clearSelectedSubscription, (state) => ({
    ...state,
    selectedSubscription: null,
  })),
);
