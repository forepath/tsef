import { Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import type { Environment } from '@forepath/framework/frontend/util-configuration';
import { ENVIRONMENT } from '@forepath/framework/frontend/util-configuration';
import { isAuthenticated } from '@forepath/identity/frontend';
import { authGuard } from './auth.guard';

// Mock isAuthenticated guard
jest.mock('@forepath/identity/frontend', () => ({
  isAuthenticated: jest.fn(),
}));

describe('authGuard', () => {
  let mockRouter: jest.Mocked<Router>;
  let mockRoute: ActivatedRouteSnapshot;
  let mockState: RouterStateSnapshot;
  let mockEnvironment: Environment;
  let mockIsAuthenticated: jest.MockedFunction<typeof isAuthenticated>;

  const setupTestBed = (environmentOverrides?: Partial<Environment>): Injector => {
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
    };

    mockIsAuthenticated = isAuthenticated as jest.MockedFunction<typeof isAuthenticated>;

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

    it('should delegate to isAuthenticated guard', () => {
      const injector = setupTestBed();
      mockIsAuthenticated.mockReturnValue(true);

      const result = runInInjectionContext(injector, () => authGuard(mockRoute, mockState));

      expect(mockIsAuthenticated).toHaveBeenCalledWith(mockRoute, mockState);
      expect(result).toBe(true);
    });

    it('should return the result from isAuthenticated guard', () => {
      const injector = setupTestBed();
      const mockUrlTree = {} as UrlTree;
      mockIsAuthenticated.mockReturnValue(mockUrlTree);

      const result = runInInjectionContext(injector, () => authGuard(mockRoute, mockState));

      expect(result).toBe(mockUrlTree);
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

    it('should allow access if API key exists in environment', () => {
      const injector = setupTestBed({
        authentication: {
          type: 'api-key',
          apiKey: 'test-api-key',
        },
      });

      const result = runInInjectionContext(injector, () => authGuard(mockRoute, mockState));

      expect(result).toBe(true);
      expect(mockRouter.createUrlTree).not.toHaveBeenCalled();
    });

    it('should allow access if API key exists in localStorage', () => {
      const injector = setupTestBed({
        authentication: {
          type: 'api-key',
        },
      });
      (window.localStorage.getItem as jest.Mock).mockReturnValue('stored-api-key');

      const result = runInInjectionContext(injector, () => authGuard(mockRoute, mockState));

      expect(result).toBe(true);
      expect(window.localStorage.getItem).toHaveBeenCalledWith('agent-controller-api-key');
      expect(mockRouter.createUrlTree).not.toHaveBeenCalled();
    });

    it('should prefer environment API key over localStorage', () => {
      const injector = setupTestBed({
        authentication: {
          type: 'api-key',
          apiKey: 'env-api-key',
        },
      });
      (window.localStorage.getItem as jest.Mock).mockReturnValue('stored-api-key');

      const result = runInInjectionContext(injector, () => authGuard(mockRoute, mockState));

      expect(result).toBe(true);
      expect(mockRouter.createUrlTree).not.toHaveBeenCalled();
    });

    it('should redirect to login if no API key exists in environment or localStorage', () => {
      const injector = setupTestBed({
        authentication: {
          type: 'api-key',
        },
      });
      (window.localStorage.getItem as jest.Mock).mockReturnValue(null);
      const mockUrlTree = {} as UrlTree;
      mockRouter.createUrlTree = jest.fn().mockReturnValue(mockUrlTree);

      const result = runInInjectionContext(injector, () => authGuard(mockRoute, mockState));

      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/login']);
      expect(window.localStorage.getItem).toHaveBeenCalledWith('agent-controller-api-key');
    });

    it('should redirect to login if API key is empty string in environment and localStorage', () => {
      const injector = setupTestBed({
        authentication: {
          type: 'api-key',
          apiKey: '',
        },
      });
      (window.localStorage.getItem as jest.Mock).mockReturnValue('');
      const mockUrlTree = {} as UrlTree;
      mockRouter.createUrlTree = jest.fn().mockReturnValue(mockUrlTree);

      const result = runInInjectionContext(injector, () => authGuard(mockRoute, mockState));

      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('when authentication type is unknown', () => {
    it('should redirect to login', () => {
      const injector = setupTestBed({
        authentication: {
          type: 'unknown' as never,
        } as Environment['authentication'],
      });
      const mockUrlTree = {} as UrlTree;
      mockRouter.createUrlTree = jest.fn().mockReturnValue(mockUrlTree);

      const result = runInInjectionContext(injector, () => authGuard(mockRoute, mockState));

      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/login']);
    });
  });
});
