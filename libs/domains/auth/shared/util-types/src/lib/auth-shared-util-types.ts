/**
 * Authentication domain shared types and interfaces
 * Framework-agnostic contracts for authentication functionality
 */

// User profile interfaces
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  groups: string[];
  attributes?: Record<string, any>;
}

// Authentication state interfaces
export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  token: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  loading: boolean;
  error: string | null;
}

// Keycloak configuration interfaces
export interface KeycloakConfig {
  url: string;
  realm: string;
  clientId: string;
}

export interface KeycloakInitOptions {
  onLoad?: 'check-sso' | 'login-required';
  silentCheckSsoRedirectUri?: string;
  checkLoginIframe?: boolean;
  checkLoginIframeInterval?: number;
  responseMode?: 'query' | 'fragment';
  flow?: 'standard' | 'implicit' | 'hybrid';
  enableLogging?: boolean;
  pkceMethod?: 'S256';
  timeSkew?: number;
  redirectUri?: string;
  messageReceiveTimeout?: number;
}

// Authentication request/response interfaces
export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  success: boolean;
  user?: UserProfile;
  token?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
}

export interface LogoutRequest {
  redirectUri?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
}

// Role and permission interfaces
export interface Role {
  id: string;
  name: string;
  description?: string;
  composite?: boolean;
  clientRole?: boolean;
  containerId?: string;
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
  type: 'resource' | 'scope';
  resourceId?: string;
  scopeId?: string;
}

// Error interfaces
export interface AuthError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Event interfaces for state management
export interface AuthEvent {
  type: 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'LOGOUT' | 'TOKEN_REFRESH' | 'USER_LOADED' | 'AUTH_ERROR';
  payload?: any;
  timestamp: number;
}

// Guard and route protection interfaces
export interface RouteGuard {
  canActivate: boolean;
  redirectTo?: string;
  reason?: string;
}

export interface ProtectedRoute {
  path: string;
  roles?: string[];
  permissions?: string[];
  requireAll?: boolean; // true = require all roles/permissions, false = require any
}

// Token interfaces
export interface TokenInfo {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  tokenType: string;
  scope?: string;
}

export interface DecodedToken {
  sub: string;
  iss: string;
  aud: string | string[];
  exp: number;
  iat: number;
  auth_time: number;
  session_state: string;
  realm_access?: {
    roles: string[];
  };
  resource_access?: Record<string, { roles: string[] }>;
  preferred_username?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  name?: string;
}
