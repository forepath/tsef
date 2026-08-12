import { createFeatureSelector, createSelector } from '@ngrx/store';

import { resolveServiceDisplayLabel } from '../../utils/service-display-label.util';

import type { ServiceDetailState } from './service-detail.reducer';

export const selectServiceDetailState = createFeatureSelector<ServiceDetailState>('serviceDetail');

export const selectServiceDetailSubscriptionId = createSelector(
  selectServiceDetailState,
  (state) => state.subscriptionId,
);
export const selectServiceDetailItemId = createSelector(selectServiceDetailState, (state) => state.itemId);
export const selectServiceDetailAdminMode = createSelector(selectServiceDetailState, (state) => state.adminMode);
export const selectServiceDetail = createSelector(selectServiceDetailState, (state) => state.detail);
export const selectServiceDetailHistory = createSelector(selectServiceDetailState, (state) => state.history);
export const selectServiceDetailFilters = createSelector(selectServiceDetailState, (state) => state.filters);
export const selectServiceDetailLoadingDetail = createSelector(
  selectServiceDetailState,
  (state) => state.loadingDetail,
);
export const selectServiceDetailLoadingHistory = createSelector(
  selectServiceDetailState,
  (state) => state.loadingHistory,
);
export const selectServiceDetailRenaming = createSelector(selectServiceDetailState, (state) => state.renaming);
export const selectServiceDetailError = createSelector(selectServiceDetailState, (state) => state.error);
export const selectServiceDetailMetersFromSocket = createSelector(
  selectServiceDetailState,
  (state) => state.metersFromSocket,
);
export const selectServiceDetailLoadingAny = createSelector(
  selectServiceDetailState,
  (state) => state.loadingDetail || state.loadingHistory || state.renaming,
);
export const selectServiceDetailDisplayLabel = createSelector(selectServiceDetail, (detail) =>
  detail ? resolveServiceDisplayLabel(detail) : '',
);
