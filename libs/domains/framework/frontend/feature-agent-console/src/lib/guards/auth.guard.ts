import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import type { Environment } from '@forepath/framework/frontend/util-configuration';
import { ENVIRONMENT } from '@forepath/framework/frontend/util-configuration';
import { isAuthenticated } from '@forepath/identity/frontend';

/**
 * LocalStorage key for storing the API key
 */
const API_KEY_STORAGE_KEY = 'agent-controller-api-key';

/**
 * Guard that protects routes based on authentication configuration.
 * - If authentication type is 'keycloak', uses Keycloak authentication guard
 * - If authentication type is 'api-key', allows access if API key exists in environment or localStorage
 * - Otherwise, redirects to /login route
 */
export const authGuard: CanActivateFn = (route, state) => {
  const environment = inject<Environment>(ENVIRONMENT);
  const router = inject(Router);

  if (environment.authentication.type === 'keycloak') {
    // Use Keycloak guard for authentication
    return isAuthenticated(route, state);
  }

  if (environment.authentication.type === 'api-key') {
    // Check if API key exists in environment
    const envApiKey = environment.authentication.apiKey;
    if (envApiKey) {
      // API key found in environment, allow access
      return true;
    }

    // Check if API key exists in localStorage
    const storedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedApiKey) {
      // API key found in localStorage, allow access
      return true;
    }

    // No API key found in environment or localStorage, redirect to login
    return router.createUrlTree(['/login']);
  }

  // For other authentication types, redirect to login
  return router.createUrlTree(['/login']);
};
