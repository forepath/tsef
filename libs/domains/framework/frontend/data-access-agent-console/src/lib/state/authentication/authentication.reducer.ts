import { createReducer, on } from '@ngrx/store';
import {
  checkAuthentication,
  checkAuthenticationFailure,
  checkAuthenticationSuccess,
  login,
  loginFailure,
  loginSuccess,
  logout,
  logoutFailure,
  logoutSuccess,
} from './authentication.actions';
import type { AuthenticationState } from './authentication.types';

export type { AuthenticationState };

export const initialAuthenticationState: AuthenticationState = {
  isAuthenticated: false,
  authenticationType: null,
  loading: false,
  error: null,
};

export const authenticationReducer = createReducer(
  initialAuthenticationState,
  // Login
  on(login, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(loginSuccess, (state, { authenticationType }) => ({
    ...state,
    isAuthenticated: true,
    authenticationType,
    loading: false,
    error: null,
  })),
  on(loginFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  // Logout
  on(logout, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(logoutSuccess, (state) => ({
    ...state,
    isAuthenticated: false,
    authenticationType: null,
    loading: false,
    error: null,
  })),
  on(logoutFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  // Check Authentication
  on(checkAuthentication, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(checkAuthenticationSuccess, (state, { isAuthenticated, authenticationType }) => ({
    ...state,
    isAuthenticated,
    authenticationType: authenticationType ?? state.authenticationType,
    loading: false,
    error: null,
  })),
  on(checkAuthenticationFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
);
