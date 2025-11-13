import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { checkAuthentication, login, logout } from './authentication.actions';
import {
  selectAuthenticationError,
  selectAuthenticationLoading,
  selectAuthenticationType,
  selectIsAuthenticated,
  selectIsNotAuthenticated,
} from './authentication.selectors';

/**
 * Facade for authentication state management.
 * Provides a unified API for login/logout that works for both API key and Keycloak authentication.
 * Consumers don't need to know which authentication type is being used.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthenticationFacade {
  private readonly store = inject(Store);

  // State observables
  readonly isAuthenticated$: Observable<boolean> = this.store.select(selectIsAuthenticated);
  readonly isNotAuthenticated$: Observable<boolean> = this.store.select(selectIsNotAuthenticated);
  readonly authenticationType$: Observable<'api-key' | 'keycloak' | null> = this.store.select(selectAuthenticationType);
  readonly loading$: Observable<boolean> = this.store.select(selectAuthenticationLoading);
  readonly error$: Observable<string | null> = this.store.select(selectAuthenticationError);

  /**
   * Login - unified method for both API key and Keycloak authentication.
   * For API key: pass the apiKey parameter
   * For Keycloak: apiKey parameter is ignored, KeycloakService will handle the login flow
   *
   * @param apiKey - Optional API key for API key authentication. Ignored for Keycloak.
   */
  login(apiKey?: string): void {
    this.store.dispatch(login({ apiKey }));
  }

  /**
   * Logout - unified method for both API key and Keycloak authentication.
   * Removes API key from localStorage for API key auth, or calls Keycloak logout for Keycloak auth.
   */
  logout(): void {
    this.store.dispatch(logout());
  }

  /**
   * Check authentication status - unified method for both authentication types.
   * Checks if user is authenticated based on the configured authentication type.
   */
  checkAuthentication(): void {
    this.store.dispatch(checkAuthentication());
  }
}
