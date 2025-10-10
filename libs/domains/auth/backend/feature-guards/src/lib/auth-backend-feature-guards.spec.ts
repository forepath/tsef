import { AuthGuard, RolesGuard, ResourceGuard, PermissionsGuard } from './auth-backend-feature-guards';
import {
  KeycloakService,
  KeycloakAuthGuard,
  KeycloakResourceGuard,
  KeycloakRoleGuard,
} from '@auth/backend/data-access-keycloak';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';

describe('Auth Guards', () => {
  let mockExecutionContext: ExecutionContext;
  let mockRequest: any;

  beforeEach(() => {
    mockRequest = {
      user: {
        sub: 'user123',
        exp: Date.now() / 1000 + 3600,
        realm_access: { roles: ['user'] },
      },
      userProfile: null,
    };

    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as ExecutionContext;
  });

  describe('AuthGuard', () => {
    let authGuard: AuthGuard;
    let keycloakAuthGuard: KeycloakAuthGuard;
    let keycloakService: KeycloakService;

    beforeEach(() => {
      keycloakAuthGuard = {
        canActivate: jest.fn().mockResolvedValue(true),
      } as any;

      keycloakService = {
        isTokenExpired: jest.fn().mockReturnValue(false),
        extractUserProfile: jest.fn().mockReturnValue({
          id: 'user123',
          username: 'testuser',
          email: 'test@example.com',
          roles: ['user'],
          groups: [],
        }),
      } as any;

      authGuard = new AuthGuard(keycloakAuthGuard, keycloakService);
    });

    it('should allow access for valid token', async () => {
      const result = await authGuard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockRequest.userProfile).toBeDefined();
    });

    it('should deny access for expired token', async () => {
      keycloakService.isTokenExpired = jest.fn().mockReturnValue(true);

      const result = await authGuard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
    });
  });

  describe('RolesGuard', () => {
    let rolesGuard: RolesGuard;
    let keycloakRoleGuard: KeycloakRoleGuard;
    let keycloakService: KeycloakService;
    let reflector: Reflector;

    beforeEach(() => {
      keycloakRoleGuard = {
        canActivate: jest.fn().mockResolvedValue(true),
      } as any;

      keycloakService = {
        hasAnyRole: jest.fn().mockReturnValue(true),
      } as any;

      reflector = {
        getAllAndOverride: jest.fn().mockReturnValue(['user']),
      } as any;

      rolesGuard = new RolesGuard(keycloakRoleGuard, keycloakService, reflector);
    });

    it('should allow access for user with required role', async () => {
      const result = await rolesGuard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(keycloakService.hasAnyRole).toHaveBeenCalledWith(mockRequest.user, ['user']);
    });

    it('should deny access for user without required role', async () => {
      keycloakService.hasAnyRole = jest.fn().mockReturnValue(false);

      const result = await rolesGuard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
    });
  });
});
