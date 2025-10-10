import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  KeycloakService,
  KeycloakAuthGuard,
  KeycloakResourceGuard,
  KeycloakRoleGuard,
} from '@auth/backend/data-access-keycloak';
import { UserProfile, DecodedToken, ProtectedRoute, RouteGuard } from '@auth/shared/util-types';

/**
 * Custom authentication guard that extends Keycloak functionality
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private keycloakAuthGuard: KeycloakAuthGuard,
    private keycloakService: KeycloakService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // Use the base Keycloak auth guard
      const isAuthenticated = await this.keycloakAuthGuard.canActivate(context);

      if (!isAuthenticated) {
        throw new UnauthorizedException('Authentication required');
      }

      // Additional custom validation
      const request = context.switchToHttp().getRequest();
      const token: DecodedToken = request.user;

      if (!token) {
        throw new UnauthorizedException('Invalid token');
      }

      // Check token expiration
      if (this.keycloakService.isTokenExpired(token)) {
        throw new UnauthorizedException('Token expired');
      }

      // Attach user profile to request
      request.userProfile = this.keycloakService.extractUserProfile(token);

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Authentication failed');
    }
  }
}

/**
 * Role-based authorization guard
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private keycloakRoleGuard: KeycloakRoleGuard,
    private keycloakService: KeycloakService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // Get required roles from metadata
      const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
        context.getHandler(),
        context.getClass(),
      ]);

      if (!requiredRoles || requiredRoles.length === 0) {
        return true; // No roles required
      }

      // Use the base Keycloak role guard
      const hasRole = await this.keycloakRoleGuard.canActivate(context);

      if (!hasRole) {
        throw new ForbiddenException('Insufficient permissions');
      }

      // Additional custom role validation
      const request = context.switchToHttp().getRequest();
      const token: DecodedToken = request.user;

      if (!token) {
        throw new UnauthorizedException('Invalid token');
      }

      // Check if user has required roles
      const hasRequiredRoles = this.keycloakService.hasAnyRole(token, requiredRoles);

      if (!hasRequiredRoles) {
        throw new ForbiddenException(`Required roles: ${requiredRoles.join(', ')}`);
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new ForbiddenException('Authorization failed');
    }
  }
}

/**
 * Resource-based authorization guard
 */
@Injectable()
export class ResourceGuard implements CanActivate {
  constructor(
    private keycloakResourceGuard: KeycloakResourceGuard,
    private keycloakService: KeycloakService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // Get required resource from metadata
      const requiredResource = this.reflector.getAllAndOverride<string>('resource', [
        context.getHandler(),
        context.getClass(),
      ]);

      if (!requiredResource) {
        return true; // No resource required
      }

      // Use the base Keycloak resource guard
      const hasResource = await this.keycloakResourceGuard.canActivate(context);

      if (!hasResource) {
        throw new ForbiddenException('Resource access denied');
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new ForbiddenException('Resource authorization failed');
    }
  }
}

/**
 * Permission-based authorization guard
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private keycloakService: KeycloakService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // Get required permissions from metadata
      const requiredPermissions = this.reflector.getAllAndOverride<string[]>('permissions', [
        context.getHandler(),
        context.getClass(),
      ]);

      if (!requiredPermissions || requiredPermissions.length === 0) {
        return true; // No permissions required
      }

      const request = context.switchToHttp().getRequest();
      const token: DecodedToken = request.user;

      if (!token) {
        throw new UnauthorizedException('Invalid token');
      }

      // Check if user has required permissions
      // This would typically involve checking against Keycloak's permission system
      // For now, we'll use a simple role-based approach
      const userRoles = this.keycloakService.extractRoles(token);
      const hasPermissions = requiredPermissions.some((permission) => userRoles.includes(permission));

      if (!hasPermissions) {
        throw new ForbiddenException(`Required permissions: ${requiredPermissions.join(', ')}`);
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new ForbiddenException('Permission authorization failed');
    }
  }
}

/**
 * Custom route guard that combines multiple authorization checks
 */
@Injectable()
export class CustomRouteGuard implements CanActivate {
  constructor(
    private authGuard: AuthGuard,
    private rolesGuard: RolesGuard,
    private resourceGuard: ResourceGuard,
    private permissionsGuard: PermissionsGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // First, ensure user is authenticated
      const isAuthenticated = await this.authGuard.canActivate(context);

      if (!isAuthenticated) {
        return false;
      }

      // Check roles
      const hasRoles = await this.rolesGuard.canActivate(context);

      if (!hasRoles) {
        return false;
      }

      // Check resources
      const hasResources = await this.resourceGuard.canActivate(context);

      if (!hasResources) {
        return false;
      }

      // Check permissions
      const hasPermissions = await this.permissionsGuard.canActivate(context);

      if (!hasPermissions) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('CustomRouteGuard error:', error);
      return false;
    }
  }
}

/**
 * Guard for checking if user owns the resource
 */
@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(private keycloakService: KeycloakService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const request = context.switchToHttp().getRequest();
      const token: DecodedToken = request.user;
      const resourceId = request.params.id || request.body.id;

      if (!token || !resourceId) {
        throw new UnauthorizedException('Invalid request');
      }

      const userProfile = this.keycloakService.extractUserProfile(token);

      // Check if user owns the resource
      // This is a simplified example - in real applications, you'd check against a database
      if (userProfile.id !== resourceId) {
        throw new ForbiddenException('You can only access your own resources');
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new ForbiddenException('Ownership check failed');
    }
  }
}

/**
 * Guard for checking user groups
 */
@Injectable()
export class GroupsGuard implements CanActivate {
  constructor(
    private keycloakService: KeycloakService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // Get required groups from metadata
      const requiredGroups = this.reflector.getAllAndOverride<string[]>('groups', [
        context.getHandler(),
        context.getClass(),
      ]);

      if (!requiredGroups || requiredGroups.length === 0) {
        return true; // No groups required
      }

      const request = context.switchToHttp().getRequest();
      const token: DecodedToken = request.user;

      if (!token) {
        throw new UnauthorizedException('Invalid token');
      }

      const userProfile = this.keycloakService.extractUserProfile(token);
      const userGroups = userProfile.groups || [];

      // Check if user belongs to any of the required groups
      const hasRequiredGroups = requiredGroups.some((group) => userGroups.includes(group));

      if (!hasRequiredGroups) {
        throw new ForbiddenException(`Required groups: ${requiredGroups.join(', ')}`);
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new ForbiddenException('Group authorization failed');
    }
  }
}

// Decorators for easy use
export const Roles = (roles: string[]) => Reflector.createDecorator<string[]>();
export const Resource = (resource: string) => Reflector.createDecorator<string>();
export const Permissions = (permissions: string[]) => Reflector.createDecorator<string[]>();
export const Groups = (groups: string[]) => Reflector.createDecorator<string[]>();
export const RequireOwnership = () => Reflector.createDecorator<boolean>();
