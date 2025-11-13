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
import { authenticationReducer, initialAuthenticationState } from './authentication.reducer';
import type { AuthenticationState } from './authentication.types';

describe('authenticationReducer', () => {
  describe('initial state', () => {
    it('should return the initial state', () => {
      const action = { type: 'UNKNOWN' };
      const state = authenticationReducer(undefined, action as never);

      expect(state).toEqual(initialAuthenticationState);
    });
  });

  describe('login', () => {
    it('should set loading to true and clear error', () => {
      const state: AuthenticationState = {
        ...initialAuthenticationState,
        error: 'Previous error',
      };

      const newState = authenticationReducer(state, login({}));

      expect(newState.loading).toBe(true);
      expect(newState.error).toBeNull();
    });

    it('should set loading to true when apiKey is provided', () => {
      const state: AuthenticationState = {
        ...initialAuthenticationState,
      };

      const newState = authenticationReducer(state, login({ apiKey: 'test-key' }));

      expect(newState.loading).toBe(true);
      expect(newState.error).toBeNull();
    });
  });

  describe('loginSuccess', () => {
    it('should set isAuthenticated to true and authenticationType', () => {
      const state: AuthenticationState = {
        ...initialAuthenticationState,
        loading: true,
      };

      const newState = authenticationReducer(state, loginSuccess({ authenticationType: 'api-key' }));

      expect(newState.isAuthenticated).toBe(true);
      expect(newState.authenticationType).toBe('api-key');
      expect(newState.loading).toBe(false);
      expect(newState.error).toBeNull();
    });

    it('should set authenticationType to keycloak', () => {
      const state: AuthenticationState = {
        ...initialAuthenticationState,
        loading: true,
      };

      const newState = authenticationReducer(state, loginSuccess({ authenticationType: 'keycloak' }));

      expect(newState.isAuthenticated).toBe(true);
      expect(newState.authenticationType).toBe('keycloak');
      expect(newState.loading).toBe(false);
    });
  });

  describe('loginFailure', () => {
    it('should set error and set loading to false', () => {
      const state: AuthenticationState = {
        ...initialAuthenticationState,
        loading: true,
      };

      const newState = authenticationReducer(state, loginFailure({ error: 'Login failed' }));

      expect(newState.error).toBe('Login failed');
      expect(newState.loading).toBe(false);
      expect(newState.isAuthenticated).toBe(false);
    });
  });

  describe('logout', () => {
    it('should set loading to true and clear error', () => {
      const state: AuthenticationState = {
        ...initialAuthenticationState,
        isAuthenticated: true,
        authenticationType: 'api-key',
        error: 'Previous error',
      };

      const newState = authenticationReducer(state, logout());

      expect(newState.loading).toBe(true);
      expect(newState.error).toBeNull();
    });
  });

  describe('logoutSuccess', () => {
    it('should reset authentication state', () => {
      const state: AuthenticationState = {
        ...initialAuthenticationState,
        isAuthenticated: true,
        authenticationType: 'api-key',
        loading: true,
      };

      const newState = authenticationReducer(state, logoutSuccess());

      expect(newState.isAuthenticated).toBe(false);
      expect(newState.authenticationType).toBeNull();
      expect(newState.loading).toBe(false);
      expect(newState.error).toBeNull();
    });
  });

  describe('logoutFailure', () => {
    it('should set error and set loading to false', () => {
      const state: AuthenticationState = {
        ...initialAuthenticationState,
        isAuthenticated: true,
        authenticationType: 'keycloak',
        loading: true,
      };

      const newState = authenticationReducer(state, logoutFailure({ error: 'Logout failed' }));

      expect(newState.error).toBe('Logout failed');
      expect(newState.loading).toBe(false);
      // State should remain authenticated on logout failure
      expect(newState.isAuthenticated).toBe(true);
    });
  });

  describe('checkAuthentication', () => {
    it('should set loading to true and clear error', () => {
      const state: AuthenticationState = {
        ...initialAuthenticationState,
        error: 'Previous error',
      };

      const newState = authenticationReducer(state, checkAuthentication());

      expect(newState.loading).toBe(true);
      expect(newState.error).toBeNull();
    });
  });

  describe('checkAuthenticationSuccess', () => {
    it('should set isAuthenticated to true and authenticationType when authenticated', () => {
      const state: AuthenticationState = {
        ...initialAuthenticationState,
        loading: true,
      };

      const newState = authenticationReducer(
        state,
        checkAuthenticationSuccess({ isAuthenticated: true, authenticationType: 'api-key' }),
      );

      expect(newState.isAuthenticated).toBe(true);
      expect(newState.authenticationType).toBe('api-key');
      expect(newState.loading).toBe(false);
      expect(newState.error).toBeNull();
    });

    it('should set isAuthenticated to false when not authenticated', () => {
      const state: AuthenticationState = {
        ...initialAuthenticationState,
        isAuthenticated: true,
        authenticationType: 'api-key',
        loading: true,
      };

      const newState = authenticationReducer(state, checkAuthenticationSuccess({ isAuthenticated: false }));

      expect(newState.isAuthenticated).toBe(false);
      expect(newState.authenticationType).toBe('api-key'); // Preserved from previous state
      expect(newState.loading).toBe(false);
      expect(newState.error).toBeNull();
    });

    it('should preserve existing authenticationType when not provided', () => {
      const state: AuthenticationState = {
        ...initialAuthenticationState,
        authenticationType: 'keycloak',
        loading: true,
      };

      const newState = authenticationReducer(state, checkAuthenticationSuccess({ isAuthenticated: true }));

      expect(newState.isAuthenticated).toBe(true);
      expect(newState.authenticationType).toBe('keycloak'); // Preserved from previous state
      expect(newState.loading).toBe(false);
    });

    it('should set authenticationType to keycloak when authenticated with keycloak', () => {
      const state: AuthenticationState = {
        ...initialAuthenticationState,
        loading: true,
      };

      const newState = authenticationReducer(
        state,
        checkAuthenticationSuccess({ isAuthenticated: true, authenticationType: 'keycloak' }),
      );

      expect(newState.isAuthenticated).toBe(true);
      expect(newState.authenticationType).toBe('keycloak');
      expect(newState.loading).toBe(false);
    });
  });

  describe('checkAuthenticationFailure', () => {
    it('should set error and set loading to false', () => {
      const state: AuthenticationState = {
        ...initialAuthenticationState,
        loading: true,
      };

      const newState = authenticationReducer(state, checkAuthenticationFailure({ error: 'Check failed' }));

      expect(newState.error).toBe('Check failed');
      expect(newState.loading).toBe(false);
    });
  });
});
