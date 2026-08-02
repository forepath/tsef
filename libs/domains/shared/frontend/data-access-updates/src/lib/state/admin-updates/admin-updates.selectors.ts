import { createFeatureSelector, createSelector } from '@ngrx/store';

import type { AdminUpdatesState } from './admin-updates.reducer';

export const selectAdminUpdatesState = createFeatureSelector<AdminUpdatesState>('adminUpdates');

export const selectAdminUpdatesStatus = createSelector(selectAdminUpdatesState, (state) => state.status);

export const selectAdminUpdatesFullState = createSelector(selectAdminUpdatesState, (state) => state.fullState);

export const selectAdminUpdatesStatusLoading = createSelector(selectAdminUpdatesState, (state) => state.statusLoading);

export const selectAdminUpdatesFullLoading = createSelector(selectAdminUpdatesState, (state) => state.fullLoading);

export const selectAdminUpdatesChecking = createSelector(selectAdminUpdatesState, (state) => state.checking);

export const selectAdminUpdatesError = createSelector(selectAdminUpdatesState, (state) => state.error);

export const selectAdminUpdatesLastCheckAt = createSelector(
  selectAdminUpdatesState,
  (state) => state.status?.lastCheckAt ?? null,
);

export const selectAdminUpdatesHasAttention = createSelector(selectAdminUpdatesStatus, (status) => {
  if (!status) {
    return false;
  }

  return status.updateState === 'update_available' || status.outdatedInstanceCount > 0;
});

export const selectAdminUpdatesInstances = createSelector(
  selectAdminUpdatesFullState,
  (fullState) => fullState?.instances ?? [],
);

export const selectAdminUpdatesScopedChangelog = createSelector(
  selectAdminUpdatesFullState,
  (fullState) => fullState?.scopedChangelog ?? { product: [], shared: [] },
);
