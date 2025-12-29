import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import type { Environment } from '@forepath/framework/frontend/util-configuration';
import { ENVIRONMENT, LocaleService } from '@forepath/framework/frontend/util-configuration';
import { Actions } from '@ngrx/effects';
import { provideMockActions } from '@ngrx/effects/testing';
import { KeycloakService } from 'keycloak-angular';
import { of } from 'rxjs';
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
import {
  checkAuthentication$,
  login$,
  loginSuccessRedirect$,
  logout$,
  logoutSuccessRedirect$,
} from './authentication.effects';

// Mock KeycloakService to avoid ES module import issues in Jest
jest.mock('keycloak-angular', () => ({
  KeycloakService: jest.fn(),
  LocaleService: jest.fn(),
}));

describe('AuthenticationEffects', () => {
  let actions$: Actions;
  let mockEnvironment: Environment;
  let mockKeycloakService: jest.Mocked<Partial<KeycloakService>>;
  let mockRouter: jest.Mocked<Partial<Router>>;
  let mockLocaleService: jest.Mocked<Partial<LocaleService>>;

  const API_KEY_STORAGE_KEY = 'agent-controller-api-key';

  beforeEach(() => {
    // Setup localStorage mock
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });

    mockEnvironment = {
      production: false,
      controller: {
        restApiUrl: 'http://localhost:3100/api',
        websocketUrl: 'http://localhost:8081/clients',
      },
      authentication: {
        type: 'api-key',
      },
      chatModelOptions: {
        default: 'Auto',
      },
      editor: {
        openInNewWindow: true,
      },
      deployment: {
        openInNewWindow: true,
      },
      cookieConsent: {
        domain: 'localhost',
        privacyPolicyUrl: 'https://example.com/privacy',
      },
    };

    mockKeycloakService = {
      login: jest.fn(),
      logout: jest.fn(),
      isLoggedIn: jest.fn(),
    };

    mockLocaleService = {
      buildAbsoluteUrl: jest.fn(),
    };

    mockRouter = {
      navigate: jest.fn().mockResolvedValue(true),
    };

    TestBed.configureTestingModule({
      providers: [
        provideMockActions(() => actions$),
        {
          provide: ENVIRONMENT,
          useValue: mockEnvironment,
        },
        {
          provide: KeycloakService,
          useValue: mockKeycloakService,
        },
        {
          provide: Router,
          useValue: mockRouter,
        },
        {
          provide: LocaleService,
          useValue: mockLocaleService,
        },
      ],
    });

    actions$ = TestBed.inject(Actions);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
    (window.localStorage.getItem as jest.Mock).mockClear();
    (window.localStorage.setItem as jest.Mock).mockClear();
    (window.localStorage.removeItem as jest.Mock).mockClear();
  });

  describe('login$', () => {
    describe('when authentication type is api-key', () => {
      beforeEach(() => {
        mockEnvironment = {
          ...mockEnvironment,
          authentication: {
            type: 'api-key',
            apiKey: 'env-api-key',
          },
        };
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
          providers: [
            provideMockActions(() => actions$),
            {
              provide: ENVIRONMENT,
              useValue: mockEnvironment,
            },
            {
              provide: KeycloakService,
              useValue: mockKeycloakService,
            },
            {
              provide: LocaleService,
              useValue: mockLocaleService,
            },
          ],
        });
      });

      it('should store API key from payload in localStorage and return loginSuccess', (done) => {
        const action = login({ apiKey: 'test-api-key' });
        const outcome = loginSuccess({ authenticationType: 'api-key' });

        actions$ = of(action);

        login$(actions$, mockEnvironment, mockKeycloakService as any).subscribe((result) => {
          expect(result).toEqual(outcome);
          expect(window.localStorage.setItem).toHaveBeenCalledWith(API_KEY_STORAGE_KEY, 'test-api-key');
          done();
        });
      });

      it('should use environment API key if payload apiKey is not provided', (done) => {
        const action = login({});
        const outcome = loginSuccess({ authenticationType: 'api-key' });

        actions$ = of(action);

        login$(actions$, mockEnvironment, mockKeycloakService as any).subscribe((result) => {
          expect(result).toEqual(outcome);
          expect(window.localStorage.setItem).toHaveBeenCalledWith(API_KEY_STORAGE_KEY, 'env-api-key');
          done();
        });
      });

      it('should return loginFailure if no API key is available', (done) => {
        mockEnvironment = {
          ...mockEnvironment,
          authentication: {
            type: 'api-key',
          },
        };
        const action = login({});
        const outcome = loginFailure({ error: 'API key is required for authentication' });

        actions$ = of(action);

        login$(actions$, mockEnvironment, mockKeycloakService as any).subscribe((result) => {
          expect(result).toEqual(outcome);
          expect(window.localStorage.setItem).not.toHaveBeenCalled();
          done();
        });
      });
    });

    describe('when authentication type is keycloak', () => {
      beforeEach(() => {
        mockEnvironment = {
          ...mockEnvironment,
          authentication: {
            type: 'keycloak',
            authServerUrl: 'http://localhost:8080',
            realm: 'test-realm',
            clientId: 'test-client',
          },
        };
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
          providers: [
            provideMockActions(() => actions$),
            {
              provide: ENVIRONMENT,
              useValue: mockEnvironment,
            },
            {
              provide: KeycloakService,
              useValue: mockKeycloakService,
            },
            {
              provide: LocaleService,
              useValue: mockLocaleService,
            },
          ],
        });
      });

      it('should call KeycloakService.login and return loginSuccess', (done) => {
        const action = login({});
        const outcome = loginSuccess({ authenticationType: 'keycloak' });

        actions$ = of(action);
        mockKeycloakService.login = jest.fn().mockResolvedValue(undefined);

        login$(actions$, mockEnvironment, mockKeycloakService as any).subscribe((result) => {
          expect(result).toEqual(outcome);
          expect(mockKeycloakService.login).toHaveBeenCalled();
          done();
        });
      });

      it('should return loginFailure on Keycloak login error', (done) => {
        const action = login({});
        const error = new Error('Keycloak login failed');
        const outcome = loginFailure({ error: 'Keycloak login failed' });

        actions$ = of(action);
        mockKeycloakService.login = jest.fn().mockRejectedValue(error);

        login$(actions$, mockEnvironment, mockKeycloakService as any).subscribe((result) => {
          expect(result).toEqual(outcome);
          done();
        });
      });

      it('should return loginFailure if KeycloakService is not available', (done) => {
        const action = login({});
        const outcome = loginFailure({ error: 'Authentication service not available' });

        actions$ = of(action);

        login$(actions$, mockEnvironment, null).subscribe((result) => {
          expect(result).toEqual(outcome);
          done();
        });
      });
    });
  });

  describe('logout$', () => {
    describe('when authentication type is api-key', () => {
      beforeEach(() => {
        mockEnvironment = {
          ...mockEnvironment,
          authentication: {
            type: 'api-key',
          },
        };
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
          providers: [
            provideMockActions(() => actions$),
            {
              provide: ENVIRONMENT,
              useValue: mockEnvironment,
            },
            {
              provide: KeycloakService,
              useValue: mockKeycloakService,
            },
            {
              provide: LocaleService,
              useValue: mockLocaleService,
            },
          ],
        });
      });

      it('should remove API key from localStorage and return logoutSuccess', (done) => {
        const action = logout();
        const outcome = logoutSuccess();

        actions$ = of(action);

        logout$(actions$, mockEnvironment, mockKeycloakService as any).subscribe((result) => {
          expect(result).toEqual(outcome);
          expect(window.localStorage.removeItem).toHaveBeenCalledWith(API_KEY_STORAGE_KEY);
          done();
        });
      });
    });

    describe('when authentication type is keycloak', () => {
      beforeEach(() => {
        mockEnvironment = {
          ...mockEnvironment,
          authentication: {
            type: 'keycloak',
            authServerUrl: 'http://localhost:8080',
            realm: 'test-realm',
            clientId: 'test-client',
          },
        };
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
          providers: [
            provideMockActions(() => actions$),
            {
              provide: ENVIRONMENT,
              useValue: mockEnvironment,
            },
            {
              provide: KeycloakService,
              useValue: mockKeycloakService,
            },
            {
              provide: LocaleService,
              useValue: mockLocaleService,
            },
          ],
        });
      });

      it('should call KeycloakService.logout and return logoutSuccess', (done) => {
        const action = logout();
        const outcome = logoutSuccess();

        actions$ = of(action);
        mockKeycloakService.logout = jest.fn().mockResolvedValue(undefined);

        logout$(actions$, mockEnvironment, mockKeycloakService as any).subscribe((result) => {
          expect(result).toEqual(outcome);
          expect(mockKeycloakService.logout).toHaveBeenCalled();
          done();
        });
      });

      it('should return logoutFailure on Keycloak logout error', (done) => {
        const action = logout();
        const error = new Error('Keycloak logout failed');
        const outcome = logoutFailure({ error: 'Keycloak logout failed' });

        actions$ = of(action);
        mockKeycloakService.logout = jest.fn().mockRejectedValue(error);

        logout$(actions$, mockEnvironment, mockKeycloakService as any).subscribe((result) => {
          expect(result).toEqual(outcome);
          done();
        });
      });

      it('should return logoutSuccess if KeycloakService is not available', (done) => {
        const action = logout();
        const outcome = logoutSuccess();

        actions$ = of(action);

        logout$(actions$, mockEnvironment, null).subscribe((result) => {
          expect(result).toEqual(outcome);
          done();
        });
      });
    });
  });

  describe('checkAuthentication$', () => {
    describe('when authentication type is api-key', () => {
      beforeEach(() => {
        mockEnvironment = {
          ...mockEnvironment,
          authentication: {
            type: 'api-key',
            apiKey: 'env-api-key',
          },
        };
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
          providers: [
            provideMockActions(() => actions$),
            {
              provide: ENVIRONMENT,
              useValue: mockEnvironment,
            },
            {
              provide: KeycloakService,
              useValue: mockKeycloakService,
            },
            {
              provide: LocaleService,
              useValue: mockLocaleService,
            },
          ],
        });
      });

      it('should return checkAuthenticationSuccess with true and authenticationType if API key exists in environment', (done) => {
        const action = checkAuthentication();
        const outcome = checkAuthenticationSuccess({ isAuthenticated: true, authenticationType: 'api-key' });

        actions$ = of(action);
        (window.localStorage.getItem as jest.Mock).mockReturnValue(null);

        checkAuthentication$(actions$, mockEnvironment, mockKeycloakService as any).subscribe((result) => {
          expect(result).toEqual(outcome);
          done();
        });
      });

      it('should return checkAuthenticationSuccess with true and authenticationType if API key exists in localStorage', (done) => {
        mockEnvironment = {
          ...mockEnvironment,
          authentication: {
            type: 'api-key',
          },
        };
        const action = checkAuthentication();
        const outcome = checkAuthenticationSuccess({ isAuthenticated: true, authenticationType: 'api-key' });

        actions$ = of(action);
        (window.localStorage.getItem as jest.Mock).mockReturnValue('stored-api-key');

        checkAuthentication$(actions$, mockEnvironment, mockKeycloakService as any).subscribe((result) => {
          expect(result).toEqual(outcome);
          expect(window.localStorage.getItem).toHaveBeenCalledWith(API_KEY_STORAGE_KEY);
          done();
        });
      });

      it('should return checkAuthenticationSuccess with false if no API key exists', (done) => {
        mockEnvironment = {
          ...mockEnvironment,
          authentication: {
            type: 'api-key',
          },
        };
        const action = checkAuthentication();
        const outcome = checkAuthenticationSuccess({ isAuthenticated: false });

        actions$ = of(action);
        (window.localStorage.getItem as jest.Mock).mockReturnValue(null);

        checkAuthentication$(actions$, mockEnvironment, mockKeycloakService as any).subscribe((result) => {
          expect(result).toEqual(outcome);
          done();
        });
      });
    });

    describe('when authentication type is keycloak', () => {
      beforeEach(() => {
        mockEnvironment = {
          ...mockEnvironment,
          authentication: {
            type: 'keycloak',
            authServerUrl: 'http://localhost:8080',
            realm: 'test-realm',
            clientId: 'test-client',
          },
        };
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
          providers: [
            provideMockActions(() => actions$),
            {
              provide: ENVIRONMENT,
              useValue: mockEnvironment,
            },
            {
              provide: KeycloakService,
              useValue: mockKeycloakService,
            },
            {
              provide: LocaleService,
              useValue: mockLocaleService,
            },
          ],
        });
      });

      it('should return checkAuthenticationSuccess with true and authenticationType if user is logged in', (done) => {
        const action = checkAuthentication();
        const outcome = checkAuthenticationSuccess({ isAuthenticated: true, authenticationType: 'keycloak' });

        actions$ = of(action);
        mockKeycloakService.isLoggedIn = jest.fn().mockReturnValue(true);

        checkAuthentication$(actions$, mockEnvironment, mockKeycloakService as any).subscribe((result) => {
          expect(result).toEqual(outcome);
          expect(mockKeycloakService.isLoggedIn).toHaveBeenCalled();
          done();
        });
      });

      it('should return checkAuthenticationSuccess with false if user is not logged in', (done) => {
        const action = checkAuthentication();
        const outcome = checkAuthenticationSuccess({ isAuthenticated: false });

        actions$ = of(action);
        mockKeycloakService.isLoggedIn = jest.fn().mockReturnValue(false);

        checkAuthentication$(actions$, mockEnvironment, mockKeycloakService as any).subscribe((result) => {
          expect(result).toEqual(outcome);
          expect(mockKeycloakService.isLoggedIn).toHaveBeenCalled();
          done();
        });
      });

      it('should return checkAuthenticationFailure on error', (done) => {
        const action = checkAuthentication();
        const error = new Error('Check failed');
        const outcome = checkAuthenticationFailure({ error: 'Check failed' });

        actions$ = of(action);
        mockKeycloakService.isLoggedIn = jest.fn().mockImplementation(() => {
          throw error;
        });

        checkAuthentication$(actions$, mockEnvironment, mockKeycloakService as any).subscribe((result) => {
          expect(result).toEqual(outcome);
          done();
        });
      });

      it('should return checkAuthenticationSuccess with false if KeycloakService is not available', (done) => {
        const action = checkAuthentication();
        const outcome = checkAuthenticationSuccess({ isAuthenticated: false });

        actions$ = of(action);

        checkAuthentication$(actions$, mockEnvironment, null).subscribe((result) => {
          expect(result).toEqual(outcome);
          done();
        });
      });
    });
  });

  describe('loginSuccessRedirect$', () => {
    it('should navigate to /clients when loginSuccess action is dispatched', (done) => {
      const action = loginSuccess({ authenticationType: 'api-key' });

      actions$ = of(action);
      mockRouter.navigate = jest.fn().mockResolvedValue(true);
      mockLocaleService.buildAbsoluteUrl = jest.fn().mockReturnValue(['/clients']);

      loginSuccessRedirect$(actions$, mockRouter as any, mockLocaleService as any).subscribe({
        complete: () => {
          expect(mockLocaleService.buildAbsoluteUrl).toHaveBeenCalledWith(['/clients']);
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/clients']);
          expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
          done();
        },
      });
    });

    it('should navigate to /clients for keycloak authentication type', (done) => {
      const action = loginSuccess({ authenticationType: 'keycloak' });

      actions$ = of(action);
      mockRouter.navigate = jest.fn().mockResolvedValue(true);
      mockLocaleService.buildAbsoluteUrl = jest.fn().mockReturnValue(['/clients']);

      loginSuccessRedirect$(actions$, mockRouter as any, mockLocaleService as any).subscribe({
        complete: () => {
          expect(mockLocaleService.buildAbsoluteUrl).toHaveBeenCalledWith(['/clients']);
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/clients']);
          expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
          done();
        },
      });
    });
  });

  describe('logoutSuccessRedirect$', () => {
    it('should navigate to /login when logoutSuccess action is dispatched', (done) => {
      const action = logoutSuccess();

      actions$ = of(action);
      mockRouter.navigate = jest.fn().mockResolvedValue(true);
      mockLocaleService.buildAbsoluteUrl = jest.fn().mockReturnValue(['/login']);

      logoutSuccessRedirect$(actions$, mockRouter as any, mockLocaleService as any).subscribe({
        complete: () => {
          expect(mockLocaleService.buildAbsoluteUrl).toHaveBeenCalledWith(['/login']);
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
          expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
          done();
        },
      });
    });
  });
});
