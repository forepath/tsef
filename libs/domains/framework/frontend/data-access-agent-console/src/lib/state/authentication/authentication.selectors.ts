import { createFeatureSelector, createSelector } from '@ngrx/store';
import type { AuthenticationState } from './authentication.types';

export const selectAuthenticationState = createFeatureSelector<AuthenticationState>('authentication');

// Basic state selectors
export const selectIsAuthenticated = createSelector(selectAuthenticationState, (state) => state.isAuthenticated);

export const selectAuthenticationType = createSelector(selectAuthenticationState, (state) => state.authenticationType);

export const selectAuthenticationLoading = createSelector(selectAuthenticationState, (state) => state.loading);

export const selectAuthenticationError = createSelector(selectAuthenticationState, (state) => state.error);

// Derived selectors
export const selectIsNotAuthenticated = createSelector(selectIsAuthenticated, (isAuthenticated) => !isAuthenticated);
