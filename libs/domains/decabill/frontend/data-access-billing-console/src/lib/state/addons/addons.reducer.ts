import { createReducer, on } from '@ngrx/store';

import type { AddonResponse } from '../../types/billing.types';

import {
  clearSelectedAddon,
  createAddon,
  createAddonFailure,
  createAddonSuccess,
  deleteAddon,
  deleteAddonFailure,
  deleteAddonSuccess,
  loadAddon,
  loadAddonFailure,
  loadAddons,
  loadAddonsBatch,
  loadAddonsFailure,
  loadAddonsSuccess,
  loadAddonSuccess,
  updateAddon,
  updateAddonFailure,
  updateAddonSuccess,
} from './addons.actions';

export interface AddonsState {
  entities: AddonResponse[];
  selectedAddon: AddonResponse | null;
  loading: boolean;
  loadingAddon: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  error: string | null;
}

export const initialAddonsState: AddonsState = {
  entities: [],
  selectedAddon: null,
  loading: false,
  loadingAddon: false,
  creating: false,
  updating: false,
  deleting: false,
  error: null,
};

export const addonsReducer = createReducer(
  initialAddonsState,
  on(loadAddons, (state) => ({ ...state, entities: [], loading: true, error: null })),
  on(loadAddonsBatch, (state, { accumulatedAddons }) => ({
    ...state,
    entities: accumulatedAddons,
    loading: true,
    error: null,
  })),
  on(loadAddonsSuccess, (state, { addons }) => ({ ...state, entities: addons, loading: false, error: null })),
  on(loadAddonsFailure, (state, { error }) => ({ ...state, loading: false, error })),
  on(loadAddon, (state) => ({ ...state, loadingAddon: true, error: null })),
  on(loadAddonSuccess, (state, { addon }) => ({
    ...state,
    entities: state.entities.some((item) => item.id === addon.id)
      ? state.entities.map((item) => (item.id === addon.id ? addon : item))
      : [...state.entities, addon],
    selectedAddon: addon,
    loadingAddon: false,
    error: null,
  })),
  on(loadAddonFailure, (state, { error }) => ({ ...state, loadingAddon: false, error })),
  on(createAddon, (state) => ({ ...state, creating: true, error: null })),
  on(createAddonSuccess, (state, { addon }) => ({
    ...state,
    entities: [...state.entities, addon],
    selectedAddon: addon,
    creating: false,
    error: null,
  })),
  on(createAddonFailure, (state, { error }) => ({ ...state, creating: false, error })),
  on(updateAddon, (state) => ({ ...state, updating: true, error: null })),
  on(updateAddonSuccess, (state, { addon }) => ({
    ...state,
    entities: state.entities.map((item) => (item.id === addon.id ? addon : item)),
    selectedAddon: state.selectedAddon?.id === addon.id ? addon : state.selectedAddon,
    updating: false,
    error: null,
  })),
  on(updateAddonFailure, (state, { error }) => ({ ...state, updating: false, error })),
  on(deleteAddon, (state) => ({ ...state, deleting: true, error: null })),
  on(deleteAddonSuccess, (state, { id }) => ({
    ...state,
    entities: state.entities.filter((item) => item.id !== id),
    selectedAddon: state.selectedAddon?.id === id ? null : state.selectedAddon,
    deleting: false,
    error: null,
  })),
  on(deleteAddonFailure, (state, { error }) => ({ ...state, deleting: false, error })),
  on(clearSelectedAddon, (state) => ({ ...state, selectedAddon: null })),
);
