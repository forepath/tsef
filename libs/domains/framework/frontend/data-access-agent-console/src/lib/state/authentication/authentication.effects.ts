import { inject } from '@angular/core';
import { Router } from '@angular/router';
import type { Environment } from '@forepath/framework/frontend/util-configuration';
import { ENVIRONMENT, LocaleService } from '@forepath/framework/frontend/util-configuration';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { KeycloakService } from 'keycloak-angular';
import { catchError, from, map, of, switchMap, tap } from 'rxjs';
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

/**
 * LocalStorage key for storing the API key
 */
const API_KEY_STORAGE_KEY = 'agent-controller-api-key';

/**
 * Normalizes error messages from authentication errors.
 */
function normalizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'An unexpected authentication error occurred';
}

/**
 * Effect to handle login for both API key and Keycloak authentication
 */
export const login$ = createEffect(
  (
    actions$ = inject(Actions),
    environment = inject<Environment>(ENVIRONMENT),
    keycloakService = inject(KeycloakService, { optional: true }),
  ) => {
    return actions$.pipe(
      ofType(login),
      switchMap(({ apiKey }) => {
        if (environment.authentication.type === 'api-key') {
          // API key authentication
          const keyToStore = apiKey || environment.authentication.apiKey;
          if (keyToStore) {
            // Store API key in localStorage
            localStorage.setItem(API_KEY_STORAGE_KEY, keyToStore);
            return of(loginSuccess({ authenticationType: 'api-key' }));
          }
          return of(loginFailure({ error: 'API key is required for authentication' }));
        } else if (environment.authentication.type === 'keycloak' && keycloakService) {
          // Keycloak authentication
          return from(keycloakService.login()).pipe(
            map(() => loginSuccess({ authenticationType: 'keycloak' })),
            catchError((error) => of(loginFailure({ error: normalizeError(error) }))),
          );
        }
        return of(loginFailure({ error: 'Authentication service not available' }));
      }),
    );
  },
  { functional: true },
);

/**
 * Effect to redirect to dashboard upon login success
 */
export const loginSuccessRedirect$ = createEffect(
  (actions$ = inject(Actions), router = inject(Router), localeService = inject(LocaleService)) => {
    return actions$.pipe(
      ofType(loginSuccess),
      tap(() => {
        router.navigate(localeService.buildAbsoluteUrl(['/clients']));
      }),
    );
  },
  { functional: true, dispatch: false },
);

/**
 * Effect to handle logout for both API key and Keycloak authentication
 */
export const logout$ = createEffect(
  (
    actions$ = inject(Actions),
    environment = inject<Environment>(ENVIRONMENT),
    keycloakService = inject(KeycloakService, { optional: true }),
  ) => {
    return actions$.pipe(
      ofType(logout),
      switchMap(() => {
        if (environment.authentication.type === 'api-key') {
          // API key authentication - remove from localStorage
          localStorage.removeItem(API_KEY_STORAGE_KEY);
          return of(logoutSuccess());
        } else if (environment.authentication.type === 'keycloak' && keycloakService) {
          // Keycloak authentication
          return from(keycloakService.logout()).pipe(
            map(() => logoutSuccess()),
            catchError((error) => of(logoutFailure({ error: normalizeError(error) }))),
          );
        }
        return of(logoutSuccess());
      }),
    );
  },
  { functional: true },
);

/**
 * Effect to redirect to login upon logout success
 */
export const logoutSuccessRedirect$ = createEffect(
  (actions$ = inject(Actions), router = inject(Router), localeService = inject(LocaleService)) => {
    return actions$.pipe(
      ofType(logoutSuccess),
      tap(() => {
        router.navigate(localeService.buildAbsoluteUrl(['/login']));
      }),
    );
  },
  { functional: true, dispatch: false },
);

/**
 * Effect to check authentication status for both API key and Keycloak
 */
export const checkAuthentication$ = createEffect(
  (
    actions$ = inject(Actions),
    environment = inject<Environment>(ENVIRONMENT),
    keycloakService = inject(KeycloakService, { optional: true }),
  ) => {
    return actions$.pipe(
      ofType(checkAuthentication),
      switchMap(() => {
        if (environment.authentication.type === 'api-key') {
          // Check if API key exists in environment or localStorage
          const envApiKey = environment.authentication.apiKey;
          const storedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
          const isAuthenticated = !!(envApiKey || storedApiKey);
          return of(
            checkAuthenticationSuccess({
              isAuthenticated,
              authenticationType: isAuthenticated ? 'api-key' : undefined,
            }),
          );
        } else if (environment.authentication.type === 'keycloak' && keycloakService) {
          // Check Keycloak authentication status
          try {
            const isAuthenticated = keycloakService.isLoggedIn();
            return of(
              checkAuthenticationSuccess({
                isAuthenticated,
                authenticationType: isAuthenticated ? 'keycloak' : undefined,
              }),
            );
          } catch (error) {
            return of(checkAuthenticationFailure({ error: normalizeError(error) }));
          }
        }
        return of(checkAuthenticationSuccess({ isAuthenticated: false }));
      }),
    );
  },
  { functional: true },
);
