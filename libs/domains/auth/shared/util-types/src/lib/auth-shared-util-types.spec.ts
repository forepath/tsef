import { UserProfile, AuthState, KeycloakConfig, LoginRequest } from './auth-shared-util-types';

describe('Auth Shared Types', () => {
  describe('UserProfile', () => {
    it('should create valid user profile', () => {
      const userProfile: UserProfile = {
        id: '123',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        roles: ['user'],
        groups: ['group1'],
        attributes: { department: 'IT' }
      };

      expect(userProfile.id).toBe('123');
      expect(userProfile.username).toBe('testuser');
      expect(userProfile.email).toBe('test@example.com');
      expect(userProfile.roles).toEqual(['user']);
      expect(userProfile.groups).toEqual(['group1']);
    });
  });

  describe('AuthState', () => {
    it('should create valid auth state', () => {
      const authState: AuthState = {
        isAuthenticated: true,
        user: null,
        token: 'token123',
        refreshToken: 'refresh123',
        expiresAt: Date.now() + 3600000,
        loading: false,
        error: null
      };

      expect(authState.isAuthenticated).toBe(true);
      expect(authState.token).toBe('token123');
      expect(authState.loading).toBe(false);
    });
  });

  describe('KeycloakConfig', () => {
    it('should create valid keycloak config', () => {
      const config: KeycloakConfig = {
        url: 'http://localhost:8080/auth',
        realm: 'test-realm',
        clientId: 'test-client'
      };

      expect(config.url).toBe('http://localhost:8080/auth');
      expect(config.realm).toBe('test-realm');
      expect(config.clientId).toBe('test-client');
    });
  });

  describe('LoginRequest', () => {
    it('should create valid login request', () => {
      const loginRequest: LoginRequest = {
        username: 'testuser',
        password: 'password123',
        rememberMe: true
      };

      expect(loginRequest.username).toBe('testuser');
      expect(loginRequest.password).toBe('password123');
      expect(loginRequest.rememberMe).toBe(true);
    });
  });
});
