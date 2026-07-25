import { createAction, props } from '@ngrx/store';

import type {
  ConfigChangeEligibility,
  ConfigChangeErrorCode,
  ConfigChangePreviewResponse,
  ConfigChangeRequest,
  ConfigChangeResponse,
} from '../../types/config-change.types';

// Eligibility Actions
export const loadConfigChangeEligibility = createAction(
  '[Subscription Config Change] Load Eligibility',
  props<{ subscriptionId: string }>(),
);

export const loadConfigChangeEligibilitySuccess = createAction(
  '[Subscription Config Change] Load Eligibility Success',
  props<{ subscriptionId: string; eligibility: ConfigChangeEligibility }>(),
);

export const loadConfigChangeEligibilityFailure = createAction(
  '[Subscription Config Change] Load Eligibility Failure',
  props<{ error: string; code: ConfigChangeErrorCode | null }>(),
);

// Preview Actions
export const previewConfigChange = createAction(
  '[Subscription Config Change] Preview',
  props<{ subscriptionId: string; request: ConfigChangeRequest }>(),
);

export const previewConfigChangeSuccess = createAction(
  '[Subscription Config Change] Preview Success',
  props<{ preview: ConfigChangePreviewResponse }>(),
);

export const previewConfigChangeFailure = createAction(
  '[Subscription Config Change] Preview Failure',
  props<{ error: string; code: ConfigChangeErrorCode | null }>(),
);

export const clearConfigChangePreview = createAction('[Subscription Config Change] Clear Preview');

// Submit Actions
export const submitConfigChange = createAction(
  '[Subscription Config Change] Submit',
  props<{ subscriptionId: string; request: ConfigChangeRequest }>(),
);

export const submitConfigChangeSuccess = createAction(
  '[Subscription Config Change] Submit Success',
  props<{ result: ConfigChangeResponse }>(),
);

export const submitConfigChangeFailure = createAction(
  '[Subscription Config Change] Submit Failure',
  props<{ error: string; code: ConfigChangeErrorCode | null }>(),
);

export const resetConfigChange = createAction('[Subscription Config Change] Reset');
