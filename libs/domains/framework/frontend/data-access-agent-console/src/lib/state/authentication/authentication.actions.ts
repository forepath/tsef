import { createAction, props } from '@ngrx/store';

/**
 * Unified login action - works for both API key and Keycloak authentication
 * For API key: pass the apiKey in the payload
 * For Keycloak: apiKey should be undefined/null, KeycloakService will handle it
 */
export const login = createAction('[Authentication] Login', props<{ apiKey?: string }>());

export const loginSuccess = createAction(
  '[Authentication] Login Success',
  props<{ authenticationType: 'api-key' | 'keycloak' }>(),
);

export const loginFailure = createAction('[Authentication] Login Failure', props<{ error: string }>());

/**
 * Unified logout action - works for both API key and Keycloak authentication
 */
export const logout = createAction('[Authentication] Logout');

export const logoutSuccess = createAction('[Authentication] Logout Success');

export const logoutFailure = createAction('[Authentication] Logout Failure', props<{ error: string }>());

/**
 * Check authentication status
 */
export const checkAuthentication = createAction('[Authentication] Check Authentication');

export const checkAuthenticationSuccess = createAction(
  '[Authentication] Check Authentication Success',
  props<{ isAuthenticated: boolean; authenticationType?: 'api-key' | 'keycloak' }>(),
);

export const checkAuthenticationFailure = createAction(
  '[Authentication] Check Authentication Failure',
  props<{ error: string }>(),
);
