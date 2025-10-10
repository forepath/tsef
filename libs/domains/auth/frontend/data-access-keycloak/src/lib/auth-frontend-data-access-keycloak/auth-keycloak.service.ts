import { Injectable } from '@angular/core';
import {
  AuthError,
  AuthState,
  DecodedToken,
  KeycloakConfig,
  KeycloakInitOptions,
  LoginRequest,
  LoginResponse,
  LogoutRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
  UserProfile,
} from '@auth/shared/util-types';
import { KeycloakService } from 'keycloak-angular';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthKeycloakService {
  private authStateSubject = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    refreshToken: null,
    expiresAt: null,
    loading: false,
    error: null,
  });

  public authState$ = this.authStateSubject.asObservable();

  constructor(private keycloakService: KeycloakService) {
    this.initializeAuthState();
  }

  /**
   * Initialize Keycloak with configuration
   */
  async initialize(config: KeycloakConfig, initOptions?: KeycloakInitOptions): Promise<boolean> {
    try {
      this.updateAuthState({ loading: true, error: null });

      const isInitialized = await this.keycloakService.init({
        config: {
          url: config.url,
          realm: config.realm,
          clientId: config.clientId,
        },
        initOptions: {
          onLoad: 'check-sso',
          silentCheckSsoRedirectUri: window.location.origin + '/assets/silent-check-sso.html',
          ...initOptions,
        },
      });

      if (isInitialized) {
        await this.loadUserProfile();
      }

      this.updateAuthState({ loading: false });
      return isInitialized;
    } catch (error) {
      this.updateAuthState({
        loading: false,
        error: this.createAuthError('INIT_FAILED', 'Failed to initialize Keycloak', error),
      });
      return false;
    }
  }

  /**
   * Login with username and password
   */
  async login(request: LoginRequest): Promise<LoginResponse> {
    try {
      this.updateAuthState({ loading: true, error: null });

      await this.keycloakService.login({
        username: request.username,
        password: request.password,
        redirectUri: window.location.origin,
      });

      const user = await this.getUserProfile();
      const token = this.getToken();

      this.updateAuthState({
        isAuthenticated: true,
        user,
        token,
        loading: false,
      });

      return {
        success: true,
        user,
        token,
      };
    } catch (error) {
      const authError = this.createAuthError('LOGIN_FAILED', 'Login failed', error);
      this.updateAuthState({ loading: false, error: authError });

      return {
        success: false,
        error: authError.message,
      };
    }
  }

  /**
   * Logout user
   */
  async logout(request?: LogoutRequest): Promise<void> {
    try {
      this.updateAuthState({ loading: true });

      await this.keycloakService.logout(request?.redirectUri || window.location.origin);

      this.updateAuthState({
        isAuthenticated: false,
        user: null,
        token: null,
        refreshToken: null,
        expiresAt: null,
        loading: false,
      });
    } catch (error) {
      this.updateAuthState({
        loading: false,
        error: this.createAuthError('LOGOUT_FAILED', 'Logout failed', error),
      });
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    try {
      this.updateAuthState({ loading: true, error: null });

      const refreshed = await this.keycloakService.updateToken(30);

      if (refreshed) {
        const token = this.getToken();
        const user = await this.getUserProfile();

        this.updateAuthState({
          token,
          user,
          loading: false,
        });

        return {
          success: true,
          token,
        };
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      const authError = this.createAuthError('REFRESH_FAILED', 'Token refresh failed', error);
      this.updateAuthState({ loading: false, error: authError });

      return {
        success: false,
        error: authError.message,
      };
    }
  }

  /**
   * Get current user profile
   */
  async getUserProfile(): Promise<UserProfile | null> {
    try {
      if (!this.keycloakService.isLoggedIn()) {
        return null;
      }

      const keycloakProfile = await this.keycloakService.loadUserProfile();
      const token = this.getDecodedToken();

      return {
        id: keycloakProfile.id || '',
        username: keycloakProfile.username || '',
        email: keycloakProfile.email || '',
        firstName: keycloakProfile.firstName,
        lastName: keycloakProfile.lastName,
        roles: this.getUserRoles(),
        groups: this.getUserGroups(),
        attributes: keycloakProfile.attributes,
      };
    } catch (error) {
      console.error('Failed to load user profile:', error);
      return null;
    }
  }

  /**
   * Get current authentication token
   */
  getToken(): string | null {
    try {
      return this.keycloakService.getToken();
    } catch (error) {
      console.error('Failed to get token:', error);
      return null;
    }
  }

  /**
   * Get decoded token information
   */
  getDecodedToken(): DecodedToken | null {
    try {
      return this.keycloakService.getKeycloakInstance().tokenParsed as DecodedToken;
    } catch (error) {
      console.error('Failed to decode token:', error);
      return null;
    }
  }

  /**
   * Get user roles
   */
  getUserRoles(): string[] {
    try {
      return this.keycloakService.getUserRoles();
    } catch (error) {
      console.error('Failed to get user roles:', error);
      return [];
    }
  }

  /**
   * Get user groups
   */
  getUserGroups(): string[] {
    try {
      const token = this.getDecodedToken();
      return token?.groups || [];
    } catch (error) {
      console.error('Failed to get user groups:', error);
      return [];
    }
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    try {
      return this.keycloakService.isUserInRole(role);
    } catch (error) {
      console.error('Failed to check role:', error);
      return false;
    }
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles: string[]): boolean {
    return roles.some((role) => this.hasRole(role));
  }

  /**
   * Check if user has all of the specified roles
   */
  hasAllRoles(roles: string[]): boolean {
    return roles.every((role) => this.hasRole(role));
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    try {
      return this.keycloakService.isLoggedIn();
    } catch (error) {
      console.error('Failed to check authentication status:', error);
      return false;
    }
  }

  /**
   * Get current authentication state
   */
  getAuthState(): AuthState {
    return this.authStateSubject.value;
  }

  /**
   * Initialize authentication state from Keycloak
   */
  private async initializeAuthState(): Promise<void> {
    try {
      if (this.keycloakService.isLoggedIn()) {
        const user = await this.getUserProfile();
        const token = this.getToken();

        this.updateAuthState({
          isAuthenticated: true,
          user,
          token,
        });
      }
    } catch (error) {
      console.error('Failed to initialize auth state:', error);
    }
  }

  /**
   * Load user profile and update state
   */
  private async loadUserProfile(): Promise<void> {
    try {
      if (this.keycloakService.isLoggedIn()) {
        const user = await this.getUserProfile();
        const token = this.getToken();

        this.updateAuthState({
          isAuthenticated: true,
          user,
          token,
        });
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  }

  /**
   * Update authentication state
   */
  private updateAuthState(updates: Partial<AuthState>): void {
    const currentState = this.authStateSubject.value;
    const newState = { ...currentState, ...updates };
    this.authStateSubject.next(newState);
  }

  /**
   * Create authentication error
   */
  private createAuthError(code: string, message: string, details?: any): AuthError {
    return {
      code,
      message,
      details,
    };
  }
}
