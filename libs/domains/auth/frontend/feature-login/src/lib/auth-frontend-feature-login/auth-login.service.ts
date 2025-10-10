import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { AuthKeycloakService } from '@auth/frontend/data-access-keycloak';
import { AuthFacade } from '@auth/frontend/feature-state';
import {
  LoginRequest,
  LoginResponse,
  LogoutRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
  UserProfile,
  AuthError,
} from '@auth/shared/util-types';
import { validateLoginRequest, ValidationResult } from '@auth/shared/util-validation';

@Injectable({
  providedIn: 'root',
})
export class AuthLoginService {
  private loginStateSubject = new BehaviorSubject<{
    loading: boolean;
    error: string | null;
    lastAction: string | null;
  }>({
    loading: false,
    error: null,
    lastAction: null,
  });

  public loginState$ = this.loginStateSubject.asObservable();

  constructor(
    private keycloakService: AuthKeycloakService,
    private authFacade: AuthFacade,
  ) {}

  /**
   * Login with username and password
   */
  async login(request: LoginRequest): Promise<LoginResponse> {
    try {
      // Validate request
      const validation = validateLoginRequest(request);
      if (!validation.isValid) {
        const errorMessage = validation.errors.map((e) => e.message).join(', ');
        this.updateLoginState({
          loading: false,
          error: errorMessage,
          lastAction: 'LOGIN_VALIDATION_FAILED',
        });
        return {
          success: false,
          error: errorMessage,
        };
      }

      this.updateLoginState({
        loading: true,
        error: null,
        lastAction: 'LOGIN_REQUEST',
      });

      // Use Keycloak service for authentication
      const response = await this.keycloakService.login(request);

      if (response.success && response.user && response.token) {
        // Update NgRx state
        this.authFacade.setAuthenticated(true);
        this.authFacade.updateUser(response.user);

        this.updateLoginState({
          loading: false,
          error: null,
          lastAction: 'LOGIN_SUCCESS',
        });

        return response;
      } else {
        this.updateLoginState({
          loading: false,
          error: response.error || 'Login failed',
          lastAction: 'LOGIN_FAILURE',
        });

        return response;
      }
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);
      this.updateLoginState({
        loading: false,
        error: errorMessage,
        lastAction: 'LOGIN_ERROR',
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Logout user
   */
  async logout(request?: LogoutRequest): Promise<void> {
    try {
      this.updateLoginState({
        loading: true,
        error: null,
        lastAction: 'LOGOUT_REQUEST',
      });

      await this.keycloakService.logout(request);

      // Update NgRx state
      this.authFacade.setAuthenticated(false);
      this.authFacade.updateUser(null as any);

      this.updateLoginState({
        loading: false,
        error: null,
        lastAction: 'LOGOUT_SUCCESS',
      });
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);
      this.updateLoginState({
        loading: false,
        error: errorMessage,
        lastAction: 'LOGOUT_ERROR',
      });
      throw error;
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    try {
      this.updateLoginState({
        loading: true,
        error: null,
        lastAction: 'REFRESH_TOKEN_REQUEST',
      });

      const response = await this.keycloakService.refreshToken(request);

      if (response.success && response.token) {
        this.updateLoginState({
          loading: false,
          error: null,
          lastAction: 'REFRESH_TOKEN_SUCCESS',
        });
      } else {
        this.updateLoginState({
          loading: false,
          error: response.error || 'Token refresh failed',
          lastAction: 'REFRESH_TOKEN_FAILURE',
        });
      }

      return response;
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);
      this.updateLoginState({
        loading: false,
        error: errorMessage,
        lastAction: 'REFRESH_TOKEN_ERROR',
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.keycloakService.isAuthenticated();
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<UserProfile | null> {
    try {
      return await this.keycloakService.getUserProfile();
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Get current authentication token
   */
  getToken(): string | null {
    return this.keycloakService.getToken();
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    return this.keycloakService.hasRole(role);
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles: string[]): boolean {
    return this.keycloakService.hasAnyRole(roles);
  }

  /**
   * Check if user has all of the specified roles
   */
  hasAllRoles(roles: string[]): boolean {
    return this.keycloakService.hasAllRoles(roles);
  }

  /**
   * Get user roles
   */
  getUserRoles(): string[] {
    return this.keycloakService.getUserRoles();
  }

  /**
   * Get user groups
   */
  getUserGroups(): string[] {
    return this.keycloakService.getUserGroups();
  }

  /**
   * Clear login error
   */
  clearError(): void {
    this.updateLoginState({ error: null });
  }

  /**
   * Get current login state
   */
  getLoginState() {
    return this.loginStateSubject.value;
  }

  /**
   * Update login state
   */
  private updateLoginState(
    updates: Partial<{
      loading: boolean;
      error: string | null;
      lastAction: string | null;
    }>,
  ): void {
    const currentState = this.loginStateSubject.value;
    const newState = { ...currentState, ...updates };
    this.loginStateSubject.next(newState);
  }

  /**
   * Extract error message from error object
   */
  private extractErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error?.message) {
      return error.message;
    }

    if (error?.error?.message) {
      return error.error.message;
    }

    return 'An unexpected error occurred';
  }
}
