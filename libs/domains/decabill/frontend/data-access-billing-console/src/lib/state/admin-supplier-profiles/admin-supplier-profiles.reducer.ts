import { createReducer, on } from '@ngrx/store';

import type { AdminSupplierProfileListItem } from '../../types/suppliers.types';

import {
  createAdminSupplierProfile,
  createAdminSupplierProfileFailure,
  createAdminSupplierProfileSuccess,
  deleteAdminSupplierProfile,
  deleteAdminSupplierProfileFailure,
  deleteAdminSupplierProfileSuccess,
  loadAdminSupplierProfiles,
  loadAdminSupplierProfilesBatch,
  loadAdminSupplierProfilesFailure,
  loadAdminSupplierProfilesSuccess,
  saveAdminSupplierProfileCustomData,
  saveAdminSupplierProfileCustomDataFailure,
  saveAdminSupplierProfileCustomDataSuccess,
  updateAdminSupplierProfile,
  updateAdminSupplierProfileFailure,
  updateAdminSupplierProfileSuccess,
} from './admin-supplier-profiles.actions';

export interface AdminSupplierProfilesState {
  profiles: AdminSupplierProfileListItem[];
  loading: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  customDataSaving: boolean;
  error: string | null;
  search: string | null;
}

export const initialAdminSupplierProfilesState: AdminSupplierProfilesState = {
  profiles: [],
  loading: false,
  creating: false,
  updating: false,
  deleting: false,
  customDataSaving: false,
  error: null,
  search: null,
};

function toOptionalString(value: string | null | undefined): string | undefined {
  return value ?? undefined;
}

function mapDetailToListItem(profile: {
  id: string;
  supplierNumber: string;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  email?: string | null;
  country?: string | null;
  isComplete: boolean;
  createdAt: string;
  updatedAt: string;
}): AdminSupplierProfileListItem {
  return {
    id: profile.id,
    supplierNumber: profile.supplierNumber,
    firstName: toOptionalString(profile.firstName),
    lastName: toOptionalString(profile.lastName),
    company: toOptionalString(profile.company),
    email: toOptionalString(profile.email),
    country: toOptionalString(profile.country),
    isComplete: profile.isComplete,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

export const adminSupplierProfilesReducer = createReducer(
  initialAdminSupplierProfilesState,
  on(loadAdminSupplierProfiles, (state, { search }) => ({
    ...state,
    profiles: [],
    loading: true,
    error: null,
    search: search?.trim() ? search.trim() : null,
  })),
  on(loadAdminSupplierProfilesBatch, (state, { accumulatedProfiles }) => ({
    ...state,
    profiles: accumulatedProfiles,
    loading: true,
  })),
  on(loadAdminSupplierProfilesSuccess, (state, { profiles }) => ({
    ...state,
    profiles,
    loading: false,
    error: null,
  })),
  on(loadAdminSupplierProfilesFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(createAdminSupplierProfile, (state) => ({ ...state, creating: true, error: null })),
  on(createAdminSupplierProfileSuccess, (state, { profile }) => ({
    ...state,
    creating: false,
    profiles: [mapDetailToListItem(profile), ...state.profiles],
  })),
  on(createAdminSupplierProfileFailure, (state, { error }) => ({ ...state, creating: false, error })),
  on(updateAdminSupplierProfile, (state) => ({ ...state, updating: true, error: null })),
  on(updateAdminSupplierProfileSuccess, (state, { profile }) => ({
    ...state,
    updating: false,
    profiles: state.profiles.map((item) =>
      item.id === profile.id
        ? {
            ...item,
            firstName: toOptionalString(profile.firstName),
            lastName: toOptionalString(profile.lastName),
            company: toOptionalString(profile.company),
            email: toOptionalString(profile.email),
            country: toOptionalString(profile.country),
            isComplete: profile.isComplete,
            updatedAt: profile.updatedAt,
          }
        : item,
    ),
  })),
  on(updateAdminSupplierProfileFailure, (state, { error }) => ({ ...state, updating: false, error })),
  on(deleteAdminSupplierProfile, (state) => ({ ...state, deleting: true, error: null })),
  on(deleteAdminSupplierProfileSuccess, (state, { id }) => ({
    ...state,
    deleting: false,
    profiles: state.profiles.filter((profile) => profile.id !== id),
  })),
  on(deleteAdminSupplierProfileFailure, (state, { error }) => ({ ...state, deleting: false, error })),
  on(saveAdminSupplierProfileCustomData, (state) => ({
    ...state,
    customDataSaving: true,
    error: null,
  })),
  on(saveAdminSupplierProfileCustomDataSuccess, (state) => ({
    ...state,
    customDataSaving: false,
    error: null,
  })),
  on(saveAdminSupplierProfileCustomDataFailure, (state, { error }) => ({
    ...state,
    customDataSaving: false,
    error,
  })),
);
