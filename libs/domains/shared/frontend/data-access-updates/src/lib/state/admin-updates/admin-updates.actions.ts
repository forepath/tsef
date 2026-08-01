import { createAction, props } from '@ngrx/store';

import type { UpdateCheckTriggerResult, UpdatesFullState, UpdatesStatusSummary } from '../../types/updates.types';

export const loadAdminUpdatesStatus = createAction('[Admin Updates] Load Status');

export const loadAdminUpdatesStatusSuccess = createAction(
  '[Admin Updates] Load Status Success',
  props<{ status: UpdatesStatusSummary }>(),
);

export const loadAdminUpdatesStatusFailure = createAction(
  '[Admin Updates] Load Status Failure',
  props<{ error: string }>(),
);

export const loadAdminUpdatesFull = createAction('[Admin Updates] Load Full');

export const loadAdminUpdatesFullSuccess = createAction(
  '[Admin Updates] Load Full Success',
  props<{ fullState: UpdatesFullState }>(),
);

export const loadAdminUpdatesFullFailure = createAction(
  '[Admin Updates] Load Full Failure',
  props<{ error: string }>(),
);

export const triggerAdminUpdateCheck = createAction('[Admin Updates] Trigger Check');

export const triggerAdminUpdateCheckSuccess = createAction(
  '[Admin Updates] Trigger Check Success',
  props<{ result: UpdateCheckTriggerResult; previousLastCheckAt: string | null }>(),
);

export const triggerAdminUpdateCheckFailure = createAction(
  '[Admin Updates] Trigger Check Failure',
  props<{ error: string }>(),
);

export const clearAdminUpdatesError = createAction('[Admin Updates] Clear Error');
