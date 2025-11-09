import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { AuthGuard, ResourceGuard, RoleGuard } from 'nest-keycloak-connect';

/**
 * Guard that validates static API key authentication.
 * If STATIC_API_KEY is set, only API key authentication is used (no Keycloak fallback, no anonymous access).
 * If STATIC_API_KEY is not set, this guard allows requests to proceed to Keycloak guards.
 */
@Injectable()
export class HybridAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const staticApiKey = process.env.STATIC_API_KEY;

    // If STATIC_API_KEY is set, require API key authentication (no Keycloak fallback, no anonymous)
    if (staticApiKey) {
      const request = context.switchToHttp().getRequest();
      const authHeader = request.headers.authorization;

      if (!authHeader) {
        throw new UnauthorizedException('Missing authorization header');
      }

      // Support both "Bearer <key>" and "ApiKey <key>" formats
      const parts = authHeader.split(' ');
      if (parts.length !== 2) {
        throw new UnauthorizedException('Invalid authorization header format');
      }

      const [scheme, providedKey] = parts;

      // Accept both "Bearer" and "ApiKey" schemes for API key
      if ((scheme === 'Bearer' || scheme === 'ApiKey') && providedKey === staticApiKey) {
        // Attach a simple user object to the request for consistency
        request.user = {
          id: 'api-key-user',
          username: 'api-key',
          roles: ['api-key-user'],
        };
        // Mark that API key authentication succeeded
        request.apiKeyAuthenticated = true;
        return true;
      }

      // API key doesn't match - reject (no Keycloak fallback, no anonymous access)
      throw new UnauthorizedException('Invalid API key');
    }

    // If STATIC_API_KEY is not set, let Keycloak guards handle authentication
    // Return true to allow the request to proceed to Keycloak guards
    return true;
  }
}

/**
 * Guard providers that conditionally include API key guard and Keycloak guards.
 * - If STATIC_API_KEY is set: Only API key guard (no Keycloak, no anonymous)
 * - If STATIC_API_KEY is not set: Only Keycloak guards
 */
export function getHybridAuthGuards() {
  const staticApiKey = process.env.STATIC_API_KEY;
  const guards: Array<{ provide: typeof APP_GUARD; useClass: new (...args: unknown[]) => CanActivate }> = [];

  // Always add API key guard (it will check if STATIC_API_KEY is set)
  guards.push({
    provide: APP_GUARD,
    useClass: HybridAuthGuard,
  });

  // Only add Keycloak guards if STATIC_API_KEY is NOT set
  // (When STATIC_API_KEY is set, we use API key only - no Keycloak fallback)
  if (!staticApiKey) {
    guards.push(
      {
        provide: APP_GUARD,
        useClass: AuthGuard,
      },
      {
        provide: APP_GUARD,
        useClass: ResourceGuard,
      },
      {
        provide: APP_GUARD,
        useClass: RoleGuard,
      },
    );
  }

  return guards;
}
