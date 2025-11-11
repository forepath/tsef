import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import type { Environment } from '@forepath/framework/frontend/util-configuration';
import { ENVIRONMENT } from '@forepath/framework/frontend/util-configuration';
import { KeycloakService } from 'keycloak-angular';

/**
 * LocalStorage key for storing the API key
 */
const API_KEY_STORAGE_KEY = 'agent-controller-api-key';

/**
 * Guard that prevents authenticated users from accessing the login route.
 * - If authentication type is 'keycloak', checks if user is authenticated and redirects to /dashboard if so
 * - If authentication type is 'api-key', checks if API key exists in environment or localStorage and redirects to /dashboard if so
 * - Otherwise, allows access to login route
 */
export const loginGuard: CanActivateFn = (_route, _state) => {
  const environment = inject<Environment>(ENVIRONMENT);
  const router = inject(Router);

  if (environment.authentication.type === 'keycloak') {
    const keycloakService = inject(KeycloakService, { optional: true });
    if (keycloakService) {
      // Check if user is authenticated
      const isAuthenticated = keycloakService.isLoggedIn();
      if (isAuthenticated) {
        // User is already authenticated, redirect to dashboard
        return router.createUrlTree(['/dashboard']);
      }
    }
    // User is not authenticated, allow access to login
    return true;
  }

  if (environment.authentication.type === 'api-key') {
    // Check if API key exists in environment
    const envApiKey = environment.authentication.apiKey;
    if (envApiKey) {
      // API key found in environment, user is "logged in", redirect to dashboard
      return router.createUrlTree(['/dashboard']);
    }

    // Check if API key exists in localStorage
    const storedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedApiKey) {
      // API key found in localStorage, user is "logged in", redirect to dashboard
      return router.createUrlTree(['/dashboard']);
    }

    // No API key found, allow access to login
    return true;
  }

  // For other authentication types, allow access to login
  return true;
};
