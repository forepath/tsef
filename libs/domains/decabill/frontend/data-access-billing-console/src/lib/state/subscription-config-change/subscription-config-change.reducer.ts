import { createReducer, on } from '@ngrx/store';

import type {
  ConfigChangeEligibility,
  ConfigChangeErrorCode,
  ConfigChangePreviewResponse,
  ConfigChangeResponse,
} from '../../types/config-change.types';

import {
  clearConfigChangePreview,
  loadConfigChangeEligibility,
  loadConfigChangeEligibilityFailure,
  loadConfigChangeEligibilitySuccess,
  previewConfigChange,
  previewConfigChangeFailure,
  previewConfigChangeSuccess,
  resetConfigChange,
  submitConfigChange,
  submitConfigChangeFailure,
  submitConfigChangeSuccess,
} from './subscription-config-change.actions';

export interface SubscriptionConfigChangeState {
  subscriptionId: string | null;
  eligibility: ConfigChangeEligibility | null;
  eligibilityLoading: boolean;
  eligibilityError: string | null;
  preview: ConfigChangePreviewResponse | null;
  previewLoading: boolean;
  previewError: string | null;
  previewErrorCode: ConfigChangeErrorCode | null;
  submitting: boolean;
  submitError: string | null;
  submitErrorCode: ConfigChangeErrorCode | null;
  result: ConfigChangeResponse | null;
}

export const initialSubscriptionConfigChangeState: SubscriptionConfigChangeState = {
  subscriptionId: null,
  eligibility: null,
  eligibilityLoading: false,
  eligibilityError: null,
  preview: null,
  previewLoading: false,
  previewError: null,
  previewErrorCode: null,
  submitting: false,
  submitError: null,
  submitErrorCode: null,
  result: null,
};

export const subscriptionConfigChangeReducer = createReducer(
  initialSubscriptionConfigChangeState,
  // Eligibility
  on(loadConfigChangeEligibility, (state, { subscriptionId }) => ({
    ...state,
    subscriptionId,
    eligibilityLoading: true,
    eligibilityError: null,
  })),
  on(loadConfigChangeEligibilitySuccess, (state, { subscriptionId, eligibility }) => ({
    ...state,
    subscriptionId,
    eligibility,
    eligibilityLoading: false,
    eligibilityError: null,
  })),
  on(loadConfigChangeEligibilityFailure, (state, { error }) => ({
    ...state,
    eligibility: null,
    eligibilityLoading: false,
    eligibilityError: error,
  })),
  // Preview
  on(previewConfigChange, (state) => ({
    ...state,
    previewLoading: true,
    previewError: null,
    previewErrorCode: null,
  })),
  on(previewConfigChangeSuccess, (state, { preview }) => ({
    ...state,
    preview,
    eligibility: preview.eligibility,
    previewLoading: false,
    previewError: null,
    previewErrorCode: null,
  })),
  on(previewConfigChangeFailure, (state, { error, code }) => ({
    ...state,
    preview: null,
    previewLoading: false,
    previewError: error,
    previewErrorCode: code,
  })),
  on(clearConfigChangePreview, (state) => ({
    ...state,
    preview: null,
    previewLoading: false,
    previewError: null,
    previewErrorCode: null,
  })),
  // Submit
  on(submitConfigChange, (state) => ({
    ...state,
    submitting: true,
    submitError: null,
    submitErrorCode: null,
    result: null,
  })),
  on(submitConfigChangeSuccess, (state, { result }) => ({
    ...state,
    submitting: false,
    submitError: null,
    submitErrorCode: null,
    result,
  })),
  on(submitConfigChangeFailure, (state, { error, code }) => ({
    ...state,
    submitting: false,
    submitError: error,
    submitErrorCode: code,
  })),
  on(resetConfigChange, () => initialSubscriptionConfigChangeState),
);
