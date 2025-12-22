import { Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import type { Environment } from '@forepath/framework/frontend/util-configuration';
import { ENVIRONMENT } from '@forepath/framework/frontend/util-configuration';
import { KeycloakService } from 'keycloak-angular';
import { loginGuard } from './login.guard';

// Mock KeycloakService to avoid ES module import issues in Jest
jest.mock('keycloak-angular', () => ({
  KeycloakService: jest.fn(),
}));

describe('loginGuard', () => {
  let mockRouter: jest.Mocked<Router>;
  let mockRoute: ActivatedRouteSnapshot;
  let mockState: RouterStateSnapshot;
  let mockEnvironment: Environment;
  let mockKeycloakService: jest.Mocked<Partial<KeycloakService>>;

  const setupTestBed = (environmentOverrides?: Partial<Environment>, keycloakServiceOverride?: any): Injector => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ENVIRONMENT,
          useValue: { ...mockEnvironment, ...environmentOverrides },
        },
        {
          provide: Router,
          useValue: mockRouter,
        },
        {
          provide: KeycloakService,
          useValue: keycloakServiceOverride ?? mockKeycloakService,
        },
      ],
    });
    return TestBed.inject(Injector);
  };

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

    mockRouter = {
      createUrlTree: jest.fn(),
    } as unknown as jest.Mocked<Router>;

    mockRoute = {} as ActivatedRouteSnapshot;
    mockState = {} as RouterStateSnapshot;

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
      cookieConsent: {
        domain: 'localhost',
        privacyPolicyUrl: 'https://example.com/privacy',
      },
    };

    mockKeycloakService = {
      isLoggedIn: jest.fn(),
    };

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
    (window.localStorage.getItem as jest.Mock).mockClear();
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
    });

    it('should redirect to dashboard if user is authenticated', () => {
      const mockIsLoggedIn = jest.fn().mockReturnValue(true);
      const injector = setupTestBed(undefined, {
        isLoggedIn: mockIsLoggedIn,
      });
      const mockUrlTree = {} as UrlTree;
      mockRouter.createUrlTree = jest.fn().mockReturnValue(mockUrlTree);

      const result = runInInjectionContext(injector, () => loginGuard(mockRoute, mockState));

      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/clients']);
      expect(mockIsLoggedIn).toHaveBeenCalled();
    });

    it('should allow access if user is not authenticated', () => {
      const injector = setupTestBed(undefined, {
        isLoggedIn: jest.fn().mockReturnValue(false),
      });

      const result = runInInjectionContext(injector, () => loginGuard(mockRoute, mockState));

      expect(result).toBe(true);
      expect(mockRouter.createUrlTree).not.toHaveBeenCalled();
    });

    it('should allow access if KeycloakService is not available', () => {
      const injector = setupTestBed(undefined, null);

      const result = runInInjectionContext(injector, () => loginGuard(mockRoute, mockState));

      expect(result).toBe(true);
      expect(mockRouter.createUrlTree).not.toHaveBeenCalled();
    });
  });

  describe('when authentication type is api-key', () => {
    beforeEach(() => {
      mockEnvironment = {
        ...mockEnvironment,
        authentication: {
          type: 'api-key',
        },
      };
    });

    it('should redirect to dashboard if API key exists in environment', () => {
      const injector = setupTestBed({
        authentication: {
          type: 'api-key',
          apiKey: 'test-api-key',
        },
      });
      const mockUrlTree = {} as UrlTree;
      mockRouter.createUrlTree = jest.fn().mockReturnValue(mockUrlTree);

      const result = runInInjectionContext(injector, () => loginGuard(mockRoute, mockState));

      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/clients']);
    });

    it('should redirect to dashboard if API key exists in localStorage', () => {
      const injector = setupTestBed({
        authentication: {
          type: 'api-key',
        },
      });
      (window.localStorage.getItem as jest.Mock).mockReturnValue('stored-api-key');
      const mockUrlTree = {} as UrlTree;
      mockRouter.createUrlTree = jest.fn().mockReturnValue(mockUrlTree);

      const result = runInInjectionContext(injector, () => loginGuard(mockRoute, mockState));

      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/clients']);
      expect(window.localStorage.getItem).toHaveBeenCalledWith('agent-controller-api-key');
    });

    it('should prefer environment API key over localStorage', () => {
      const injector = setupTestBed({
        authentication: {
          type: 'api-key',
          apiKey: 'env-api-key',
        },
      });
      (window.localStorage.getItem as jest.Mock).mockReturnValue('stored-api-key');
      const mockUrlTree = {} as UrlTree;
      mockRouter.createUrlTree = jest.fn().mockReturnValue(mockUrlTree);

      const result = runInInjectionContext(injector, () => loginGuard(mockRoute, mockState));

      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/clients']);
      // Should check environment first, so localStorage might not be checked
    });

    it('should allow access if no API key exists in environment or localStorage', () => {
      const injector = setupTestBed({
        authentication: {
          type: 'api-key',
        },
      });
      (window.localStorage.getItem as jest.Mock).mockReturnValue(null);

      const result = runInInjectionContext(injector, () => loginGuard(mockRoute, mockState));

      expect(result).toBe(true);
      expect(mockRouter.createUrlTree).not.toHaveBeenCalled();
      expect(window.localStorage.getItem).toHaveBeenCalledWith('agent-controller-api-key');
    });

    it('should allow access if API key is empty string in environment and localStorage', () => {
      const injector = setupTestBed({
        authentication: {
          type: 'api-key',
          apiKey: '',
        },
      });
      (window.localStorage.getItem as jest.Mock).mockReturnValue('');

      const result = runInInjectionContext(injector, () => loginGuard(mockRoute, mockState));

      expect(result).toBe(true);
      expect(mockRouter.createUrlTree).not.toHaveBeenCalled();
    });
  });

  describe('when authentication type is unknown', () => {
    it('should allow access to login', () => {
      const injector = setupTestBed({
        authentication: {
          type: 'unknown' as never,
        } as Environment['authentication'],
      });

      const result = runInInjectionContext(injector, () => loginGuard(mockRoute, mockState));

      expect(result).toBe(true);
      expect(mockRouter.createUrlTree).not.toHaveBeenCalled();
    });
  });
});
