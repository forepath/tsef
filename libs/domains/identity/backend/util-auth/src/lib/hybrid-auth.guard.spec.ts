import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { AuthGuard, ResourceGuard, RoleGuard } from 'nest-keycloak-connect';
import { HybridAuthGuard, getHybridAuthGuards } from './hybrid-auth.guard';

describe('HybridAuthGuard', () => {
  let guard: HybridAuthGuard;
  let reflector: Reflector;
  let mockExecutionContext: jest.Mocked<ExecutionContext>;
  let originalStaticApiKey: string | undefined;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new HybridAuthGuard(reflector);

    // Save original STATIC_API_KEY
    originalStaticApiKey = process.env.STATIC_API_KEY;

    // Mock ExecutionContext
    mockExecutionContext = {
      switchToHttp: jest.fn(),
      getClass: jest.fn(),
      getHandler: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    } as unknown as jest.Mocked<ExecutionContext>;
  });

  afterEach(() => {
    // Restore original STATIC_API_KEY
    if (originalStaticApiKey !== undefined) {
      process.env.STATIC_API_KEY = originalStaticApiKey;
    } else {
      delete process.env.STATIC_API_KEY;
    }
    jest.clearAllMocks();
  });

  describe('when STATIC_API_KEY is not set', () => {
    beforeEach(() => {
      delete process.env.STATIC_API_KEY;
    });

    it('should allow request to proceed to Keycloak guards', () => {
      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockExecutionContext.switchToHttp).not.toHaveBeenCalled();
    });
  });

  describe('when STATIC_API_KEY is set', () => {
    const testApiKey = 'test-api-key-123';

    beforeEach(() => {
      process.env.STATIC_API_KEY = testApiKey;
    });

    it('should throw UnauthorizedException when authorization header is missing', () => {
      const mockRequest = {
        headers: {},
      };

      mockExecutionContext.switchToHttp = jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      });

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(mockExecutionContext)).toThrow('Missing authorization header');
    });

    it('should throw UnauthorizedException when authorization header format is invalid (no space)', () => {
      const mockRequest = {
        headers: {
          authorization: 'InvalidFormat',
        },
      };

      mockExecutionContext.switchToHttp = jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      });

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(mockExecutionContext)).toThrow('Invalid authorization header format');
    });

    it('should throw UnauthorizedException when authorization header format is invalid (too many parts)', () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer key extra',
        },
      };

      mockExecutionContext.switchToHttp = jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      });

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(mockExecutionContext)).toThrow('Invalid authorization header format');
    });

    it('should throw UnauthorizedException when API key does not match', () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer wrong-key',
        },
      };

      mockExecutionContext.switchToHttp = jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      });

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(mockExecutionContext)).toThrow('Invalid API key');
    });

    it('should throw UnauthorizedException when scheme is not Bearer or ApiKey', () => {
      const mockRequest = {
        headers: {
          authorization: 'Basic test-api-key-123',
        },
      };

      mockExecutionContext.switchToHttp = jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      });

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(mockExecutionContext)).toThrow('Invalid API key');
    });

    it('should authenticate successfully with Bearer scheme and correct API key', () => {
      const mockRequest = {
        headers: {
          authorization: `Bearer ${testApiKey}`,
        },
        user: undefined,
        apiKeyAuthenticated: undefined,
      };

      mockExecutionContext.switchToHttp = jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      });

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockRequest.user).toEqual({
        id: 'api-key-user',
        username: 'api-key',
        roles: ['api-key-user'],
      });
      expect(mockRequest.apiKeyAuthenticated).toBe(true);
    });

    it('should authenticate successfully with ApiKey scheme and correct API key', () => {
      const mockRequest = {
        headers: {
          authorization: `ApiKey ${testApiKey}`,
        },
        user: undefined,
        apiKeyAuthenticated: undefined,
      };

      mockExecutionContext.switchToHttp = jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      });

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockRequest.user).toEqual({
        id: 'api-key-user',
        username: 'api-key',
        roles: ['api-key-user'],
      });
      expect(mockRequest.apiKeyAuthenticated).toBe(true);
    });

    it('should handle case-sensitive API key matching', () => {
      const mockRequest = {
        headers: {
          authorization: `Bearer ${testApiKey.toUpperCase()}`,
        },
      };

      mockExecutionContext.switchToHttp = jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      });

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(mockExecutionContext)).toThrow('Invalid API key');
    });

    it('should handle empty API key in header', () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer ',
        },
      };

      mockExecutionContext.switchToHttp = jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      });

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(mockExecutionContext)).toThrow('Invalid API key');
    });
  });
});

describe('getHybridAuthGuards', () => {
  let originalStaticApiKey: string | undefined;

  beforeEach(() => {
    // Save original STATIC_API_KEY
    originalStaticApiKey = process.env.STATIC_API_KEY;
  });

  afterEach(() => {
    // Restore original STATIC_API_KEY
    if (originalStaticApiKey !== undefined) {
      process.env.STATIC_API_KEY = originalStaticApiKey;
    } else {
      delete process.env.STATIC_API_KEY;
    }
  });

  describe('when STATIC_API_KEY is not set', () => {
    beforeEach(() => {
      delete process.env.STATIC_API_KEY;
    });

    it('should return HybridAuthGuard and all Keycloak guards', () => {
      const guards = getHybridAuthGuards();

      expect(guards).toHaveLength(4);
      expect(guards[0]).toEqual({
        provide: APP_GUARD,
        useClass: HybridAuthGuard,
      });
      expect(guards[1]).toEqual({
        provide: APP_GUARD,
        useClass: AuthGuard,
      });
      expect(guards[2]).toEqual({
        provide: APP_GUARD,
        useClass: ResourceGuard,
      });
      expect(guards[3]).toEqual({
        provide: APP_GUARD,
        useClass: RoleGuard,
      });
    });
  });

  describe('when STATIC_API_KEY is set', () => {
    beforeEach(() => {
      process.env.STATIC_API_KEY = 'test-api-key';
    });

    it('should return only HybridAuthGuard (no Keycloak guards)', () => {
      const guards = getHybridAuthGuards();

      expect(guards).toHaveLength(1);
      expect(guards[0]).toEqual({
        provide: APP_GUARD,
        useClass: HybridAuthGuard,
      });
    });
  });

  describe('when STATIC_API_KEY is empty string', () => {
    beforeEach(() => {
      process.env.STATIC_API_KEY = '';
    });

    it('should return HybridAuthGuard and all Keycloak guards (empty string is falsy)', () => {
      const guards = getHybridAuthGuards();

      expect(guards).toHaveLength(4);
      expect(guards[0]).toEqual({
        provide: APP_GUARD,
        useClass: HybridAuthGuard,
      });
      expect(guards[1]).toEqual({
        provide: APP_GUARD,
        useClass: AuthGuard,
      });
    });
  });
});
