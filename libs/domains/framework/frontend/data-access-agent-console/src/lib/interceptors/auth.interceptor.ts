import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import type { Environment } from '@forepath/framework/frontend/util-configuration';
import { ENVIRONMENT } from '@forepath/framework/frontend/util-configuration';
import { KeycloakService } from 'keycloak-angular';
import { catchError, from, switchMap } from 'rxjs';

/**
 * HTTP interceptor that conditionally applies API key or Keycloak authentication
 * based on the environment configuration.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const environment = inject<Environment>(ENVIRONMENT);
  const keycloakService = inject(KeycloakService, { optional: true });

  // Only apply authentication to API requests
  const apiUrl = environment.controller?.restApiUrl;
  if (!apiUrl) {
    return next(req);
  }

  // Check if the request URL matches the API URL
  // Services use absolute URLs, so we check for exact match
  if (!req.url.startsWith(apiUrl)) {
    return next(req);
  }

  // Apply authentication based on configuration
  if (environment.authentication.type === 'api-key') {
    const apiKey = environment.authentication.apiKey;
    if (apiKey) {
      const authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      return next(authReq);
    } else {
      const apiKey = localStorage.getItem('agent-controller-api-key');
      if (apiKey) {
        const authReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${apiKey}`,
          },
        });
        return next(authReq);
      }
    }
    return next(req);
  } else if (environment.authentication.type === 'keycloak' && keycloakService) {
    // getToken() returns a Promise, so we need to handle it asynchronously
    return from(keycloakService.getToken()).pipe(
      switchMap((token) => {
        if (token) {
          const authReq = req.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`,
            },
          });
          return next(authReq);
        }
        // If token is null/undefined, proceed without auth header
        return next(req);
      }),
      catchError((error) => {
        // If token retrieval fails, proceed without auth header
        // The API will return 401 if authentication is required
        console.warn('Failed to get Keycloak token:', error);
        return next(req);
      }),
    );
  }

  return next(req);
};
