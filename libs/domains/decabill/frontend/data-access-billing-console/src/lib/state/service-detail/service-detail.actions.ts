import { createAction, props } from '@ngrx/store';

import type {
  MeterHistoryFilters,
  SubscriptionItemDetailResponse,
  SubscriptionMeterHistory,
  SubscriptionMeterSummary,
} from '../../types/billing.types';

export const enterServiceDetail = createAction(
  '[Service Detail] Enter',
  props<{ subscriptionId: string; itemId: string; adminMode?: boolean }>(),
);

export const loadDetailSuccess = createAction(
  '[Service Detail] Load Detail Success',
  props<{ detail: SubscriptionItemDetailResponse }>(),
);
export const loadDetailFailure = createAction('[Service Detail] Load Detail Failure', props<{ error: string }>());

export const loadHistory = createAction(
  '[Service Detail] Load History',
  props<{ subscriptionId: string; filters: MeterHistoryFilters; adminMode?: boolean }>(),
);
export const loadHistorySuccess = createAction(
  '[Service Detail] Load History Success',
  props<{ history: SubscriptionMeterHistory }>(),
);
export const loadHistoryFailure = createAction('[Service Detail] Load History Failure', props<{ error: string }>());

export const applyFilters = createAction(
  '[Service Detail] Apply Filters',
  props<{ filters: MeterHistoryFilters; adminMode?: boolean }>(),
);
export const resetFilters = createAction('[Service Detail] Reset Filters', props<{ adminMode?: boolean }>());

export const updateDisplayName = createAction(
  '[Service Detail] Update Display Name',
  props<{ subscriptionId: string; itemId: string; displayName: string | null; adminMode?: boolean }>(),
);
export const updateDisplayNameSuccess = createAction(
  '[Service Detail] Update Display Name Success',
  props<{ subscriptionId: string; itemId: string; displayName: string | null }>(),
);
export const updateDisplayNameFailure = createAction(
  '[Service Detail] Update Display Name Failure',
  props<{ error: string }>(),
);

export const clearServiceDetail = createAction('[Service Detail] Clear');

export const meterSummaryPush = createAction(
  '[Service Detail] Meter Summary Push',
  props<{ subscriptionId: string; meters: SubscriptionMeterSummary[] }>(),
);
