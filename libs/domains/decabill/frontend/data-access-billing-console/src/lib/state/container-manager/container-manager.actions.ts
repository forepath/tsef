import { createAction, props } from '@ngrx/store';

import type {
  ContainerManagerContainersResponse,
  ContainerManagerLogsResponse,
  ContainerManagerNetworksResponse,
  ContainerManagerStatsHistoryResponse,
} from '../../types/billing.types';

export const enterContainerManager = createAction(
  '[Container Manager] Enter',
  props<{ subscriptionId: string; itemId: string; adminMode?: boolean }>(),
);

export const loadContainersSuccess = createAction(
  '[Container Manager] Load Containers Success',
  props<{ response: ContainerManagerContainersResponse }>(),
);
export const loadContainersFailure = createAction(
  '[Container Manager] Load Containers Failure',
  props<{ error: string }>(),
);

export const loadNetworksSuccess = createAction(
  '[Container Manager] Load Networks Success',
  props<{ response: ContainerManagerNetworksResponse }>(),
);
export const loadNetworksFailure = createAction(
  '[Container Manager] Load Networks Failure',
  props<{ error: string }>(),
);

export const selectContainer = createAction(
  '[Container Manager] Select Container',
  props<{ containerId: string | null }>(),
);

export const loadStatsHistory = createAction(
  '[Container Manager] Load Stats History',
  props<{ containerId: string; adminMode?: boolean }>(),
);
export const loadStatsHistorySuccess = createAction(
  '[Container Manager] Load Stats History Success',
  props<{ response: ContainerManagerStatsHistoryResponse }>(),
);
export const loadStatsHistoryFailure = createAction(
  '[Container Manager] Load Stats History Failure',
  props<{ error: string }>(),
);

export const loadLogs = createAction(
  '[Container Manager] Load Logs',
  props<{ containerId: string; adminMode?: boolean; silent?: boolean }>(),
);
export const loadLogsSuccess = createAction(
  '[Container Manager] Load Logs Success',
  props<{ response: ContainerManagerLogsResponse }>(),
);
export const loadLogsFailure = createAction(
  '[Container Manager] Load Logs Failure',
  props<{ error: string; silent?: boolean }>(),
);

export const clearContainerManager = createAction('[Container Manager] Clear');
