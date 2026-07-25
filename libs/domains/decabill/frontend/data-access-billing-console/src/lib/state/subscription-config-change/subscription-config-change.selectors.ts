import { createFeatureSelector, createSelector } from '@ngrx/store';

import type { SubscriptionConfigChangeState } from './subscription-config-change.reducer';

export const selectSubscriptionConfigChangeState =
  createFeatureSelector<SubscriptionConfigChangeState>('subscriptionConfigChange');

export const selectConfigChangeSubscriptionId = createSelector(
  selectSubscriptionConfigChangeState,
  (state) => state.subscriptionId,
);

export const selectConfigChangeEligibility = createSelector(
  selectSubscriptionConfigChangeState,
  (state) => state.eligibility,
);

export const selectConfigChangeEligibilityLoading = createSelector(
  selectSubscriptionConfigChangeState,
  (state) => state.eligibilityLoading,
);

export const selectConfigChangeEligibilityError = createSelector(
  selectSubscriptionConfigChangeState,
  (state) => state.eligibilityError,
);

export const selectConfigChangePreview = createSelector(selectSubscriptionConfigChangeState, (state) => state.preview);

export const selectConfigChangePreviewLoading = createSelector(
  selectSubscriptionConfigChangeState,
  (state) => state.previewLoading,
);

export const selectConfigChangePreviewError = createSelector(
  selectSubscriptionConfigChangeState,
  (state) => state.previewError,
);

export const selectConfigChangePreviewErrorCode = createSelector(
  selectSubscriptionConfigChangeState,
  (state) => state.previewErrorCode,
);

export const selectConfigChangeSubmitting = createSelector(
  selectSubscriptionConfigChangeState,
  (state) => state.submitting,
);

export const selectConfigChangeSubmitError = createSelector(
  selectSubscriptionConfigChangeState,
  (state) => state.submitError,
);

export const selectConfigChangeSubmitErrorCode = createSelector(
  selectSubscriptionConfigChangeState,
  (state) => state.submitErrorCode,
);

export const selectConfigChangeResult = createSelector(selectSubscriptionConfigChangeState, (state) => state.result);

export const selectConfigChangeAmounts = createSelector(
  selectConfigChangePreview,
  (preview) => preview?.amounts ?? null,
);

export const selectConfigChangeDisclaimer = createSelector(
  selectConfigChangePreview,
  (preview) => preview?.disclaimer ?? null,
);

export const selectConfigChangeDiscounts = createSelector(
  selectConfigChangePreview,
  (preview) => preview?.discounts ?? [],
);

export const selectCanRequestConfigChange = createSelector(
  selectConfigChangeEligibility,
  (eligibility) => eligibility?.canRequestChange === true,
);

/** True while any config-change request is in flight. */
export const selectConfigChangeBusy = createSelector(
  selectConfigChangeEligibilityLoading,
  selectConfigChangePreviewLoading,
  selectConfigChangeSubmitting,
  (eligibilityLoading, previewLoading, submitting) => eligibilityLoading || previewLoading || submitting,
);
