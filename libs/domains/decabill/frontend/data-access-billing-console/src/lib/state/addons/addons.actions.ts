import { createAction, props } from '@ngrx/store';

import type { AddonResponse, CreateAddonDto, ListParams, UpdateAddonDto } from '../../types/billing.types';

export const loadAddons = createAction('[Addons] Load Addons', props<{ params?: ListParams }>());
export const loadAddonsSuccess = createAction('[Addons] Load Addons Success', props<{ addons: AddonResponse[] }>());
export const loadAddonsFailure = createAction('[Addons] Load Addons Failure', props<{ error: string }>());
export const loadAddonsBatch = createAction(
  '[Addons] Load Addons Batch',
  props<{ offset: number; accumulatedAddons: AddonResponse[] }>(),
);
export const loadAddon = createAction('[Addons] Load Addon', props<{ id: string }>());
export const loadAddonSuccess = createAction('[Addons] Load Addon Success', props<{ addon: AddonResponse }>());
export const loadAddonFailure = createAction('[Addons] Load Addon Failure', props<{ error: string }>());
export const createAddon = createAction('[Addons] Create Addon', props<{ addon: CreateAddonDto }>());
export const createAddonSuccess = createAction('[Addons] Create Addon Success', props<{ addon: AddonResponse }>());
export const createAddonFailure = createAction('[Addons] Create Addon Failure', props<{ error: string }>());
export const updateAddon = createAction('[Addons] Update Addon', props<{ id: string; addon: UpdateAddonDto }>());
export const updateAddonSuccess = createAction('[Addons] Update Addon Success', props<{ addon: AddonResponse }>());
export const updateAddonFailure = createAction('[Addons] Update Addon Failure', props<{ error: string }>());
export const deleteAddon = createAction('[Addons] Delete Addon', props<{ id: string }>());
export const deleteAddonSuccess = createAction('[Addons] Delete Addon Success', props<{ id: string }>());
export const deleteAddonFailure = createAction('[Addons] Delete Addon Failure', props<{ error: string }>());
export const clearSelectedAddon = createAction('[Addons] Clear Selected Addon');
