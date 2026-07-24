import { createFeatureSelector, createSelector } from '@ngrx/store';

import type { AddonsState } from './addons.reducer';

export const selectAddonsState = createFeatureSelector<AddonsState>('addons');
export const selectAddonsEntities = createSelector(selectAddonsState, (state) => state.entities);
export const selectActiveAddons = createSelector(selectAddonsEntities, (entities) =>
  entities.filter((addon) => addon.isActive),
);
export const selectSelectedAddon = createSelector(selectAddonsState, (state) => state.selectedAddon);
export const selectAddonsLoading = createSelector(selectAddonsState, (state) => state.loading);
export const selectAddonLoading = createSelector(selectAddonsState, (state) => state.loadingAddon);
export const selectAddonsCreating = createSelector(selectAddonsState, (state) => state.creating);
export const selectAddonsUpdating = createSelector(selectAddonsState, (state) => state.updating);
export const selectAddonsDeleting = createSelector(selectAddonsState, (state) => state.deleting);
export const selectAddonsError = createSelector(selectAddonsState, (state) => state.error);
export const selectAddonsLoadingAny = createSelector(
  selectAddonsState,
  (state) => state.loading || state.loadingAddon || state.creating || state.updating || state.deleting,
);
export const selectAddonById = (id: string) =>
  createSelector(selectAddonsEntities, (entities) => entities.find((addon) => addon.id === id));
