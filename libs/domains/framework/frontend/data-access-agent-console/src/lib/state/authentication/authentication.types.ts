/**
 * Authentication state types
 */

export type AuthenticationType = 'api-key' | 'keycloak';

export interface AuthenticationState {
  isAuthenticated: boolean;
  authenticationType: AuthenticationType | null;
  loading: boolean;
  error: string | null;
}
