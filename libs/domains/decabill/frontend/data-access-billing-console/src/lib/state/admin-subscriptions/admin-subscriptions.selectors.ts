import { createFeatureSelector, createSelector } from '@ngrx/store';

import type { AdminSubscriptionsState } from './admin-subscriptions.reducer';

export const selectAdminSubscriptionsState = createFeatureSelector<AdminSubscriptionsState>('adminSubscriptions');

export const selectAdminSubscriptions = createSelector(selectAdminSubscriptionsState, (state) => state.subscriptions);

export const selectAdminSubscriptionsLoading = createSelector(selectAdminSubscriptionsState, (state) => state.loading);

export const selectAdminSubscriptionsCanceling = createSelector(
  selectAdminSubscriptionsState,
  (state) => state.canceling,
);

export const selectAdminSubscriptionsWithdrawing = createSelector(
  selectAdminSubscriptionsState,
  (state) => state.withdrawing,
);

export const selectAdminSubscriptionsInstantCanceling = createSelector(
  selectAdminSubscriptionsState,
  (state) => state.instantCanceling,
);

export const selectAdminSubscriptionsResuming = createSelector(
  selectAdminSubscriptionsState,
  (state) => state.resuming,
);

export const selectAdminSubscriptionsError = createSelector(selectAdminSubscriptionsState, (state) => state.error);

export const selectAdminSubscriptionsHasMore = createSelector(selectAdminSubscriptionsState, (state) => state.hasMore);

export const selectAdminSubscriptionsNextOffset = createSelector(
  selectAdminSubscriptionsState,
  (state) => state.nextOffset,
);

export const selectAdminSubscriptionsAppendLoading = createSelector(
  selectAdminSubscriptionsState,
  (state) => state.appendLoading,
);

export const selectAdminSubscriptionsAppendError = createSelector(
  selectAdminSubscriptionsState,
  (state) => state.appendError,
);
