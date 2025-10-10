import { Injectable, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KeycloakConnectModule, ResourceGuard, RoleGuard, AuthGuard } from 'nest-keycloak-connect';
import { KeycloakConfig, UserProfile, DecodedToken, AuthError } from '@auth/shared/util-types';

@Injectable()
export class KeycloakService {
  constructor(private configService: ConfigService) {}

  /**
   * Get Keycloak configuration from environment variables
   */
  getKeycloakConfig(): KeycloakConfig {
    return {
      url: this.configService.get<string>('KEYCLOAK_URL', 'http://localhost:8080/auth'),
      realm: this.configService.get<string>('KEYCLOAK_REALM', 'master'),
      clientId: this.configService.get<string>('KEYCLOAK_CLIENT_ID', 'nestjs-app'),
    };
  }

  /**
   * Extract user profile from Keycloak token
   */
  extractUserProfile(token: DecodedToken): UserProfile {
    return {
      id: token.sub,
      username: token.preferred_username || '',
      email: token.email || '',
      firstName: token.given_name,
      lastName: token.family_name,
      roles: this.extractRoles(token),
      groups: token.groups || [],
      attributes: {
        name: token.name,
        auth_time: token.auth_time,
        session_state: token.session_state,
      },
    };
  }

  /**
   * Extract roles from Keycloak token
   */
  private extractRoles(token: DecodedToken): string[] {
    const roles: string[] = [];

    // Realm roles
    if (token.realm_access?.roles) {
      roles.push(...token.realm_access.roles);
    }

    // Resource-specific roles
    if (token.resource_access) {
      Object.values(token.resource_access).forEach((resource) => {
        if (resource.roles) {
          roles.push(...resource.roles);
        }
      });
    }

    return roles;
  }

  /**
   * Validate token expiration
   */
  isTokenExpired(token: DecodedToken): boolean {
    const now = Math.floor(Date.now() / 1000);
    return token.exp < now;
  }

  /**
   * Check if user has specific role
   */
  hasRole(token: DecodedToken, role: string): boolean {
    const roles = this.extractRoles(token);
    return roles.includes(role);
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(token: DecodedToken, roles: string[]): boolean {
    const userRoles = this.extractRoles(token);
    return roles.some((role) => userRoles.includes(role));
  }

  /**
   * Check if user has all of the specified roles
   */
  hasAllRoles(token: DecodedToken, roles: string[]): boolean {
    const userRoles = this.extractRoles(token);
    return roles.every((role) => userRoles.includes(role));
  }

  /**
   * Create authentication error
   */
  createAuthError(code: string, message: string, details?: any): AuthError {
    return {
      code,
      message,
      details,
    };
  }
}

@Injectable()
export class KeycloakAuthGuard extends AuthGuard {
  constructor(private keycloakService: KeycloakService) {
    super();
  }

  /**
   * Enhanced authentication guard with custom logic
   */
  async canActivate(context: any): Promise<boolean> {
    try {
      const isAuthenticated = await super.canActivate(context);

      if (!isAuthenticated) {
        return false;
      }

      // Additional custom validation logic can be added here
      const request = context.switchToHttp().getRequest();
      const token = request.user;

      if (token && this.keycloakService.isTokenExpired(token)) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('KeycloakAuthGuard error:', error);
      return false;
    }
  }
}

@Injectable()
export class KeycloakResourceGuard extends ResourceGuard {
  constructor(private keycloakService: KeycloakService) {
    super();
  }

  /**
   * Enhanced resource guard with custom logic
   */
  async canActivate(context: any): Promise<boolean> {
    try {
      return await super.canActivate(context);
    } catch (error) {
      console.error('KeycloakResourceGuard error:', error);
      return false;
    }
  }
}

@Injectable()
export class KeycloakRoleGuard extends RoleGuard {
  constructor(private keycloakService: KeycloakService) {
    super();
  }

  /**
   * Enhanced role guard with custom logic
   */
  async canActivate(context: any): Promise<boolean> {
    try {
      return await super.canActivate(context);
    } catch (error) {
      console.error('KeycloakRoleGuard error:', error);
      return false;
    }
  }
}

@Module({
  imports: [
    ConfigModule,
    KeycloakConnectModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        authServerUrl: configService.get<string>('KEYCLOAK_URL', 'http://localhost:8080/auth'),
        realm: configService.get<string>('KEYCLOAK_REALM', 'master'),
        clientId: configService.get<string>('KEYCLOAK_CLIENT_ID', 'nestjs-app'),
        secret: configService.get<string>('KEYCLOAK_CLIENT_SECRET', ''),
        cookieKey: 'KEYCLOAK_JWT',
        logLevels: ['verbose'],
        useNestLogger: true,
        policyEnforcement: 'permissive',
        tokenValidation: 'online',
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [KeycloakService, KeycloakAuthGuard, KeycloakResourceGuard, KeycloakRoleGuard],
  exports: [KeycloakService, KeycloakAuthGuard, KeycloakResourceGuard, KeycloakRoleGuard],
})
export class KeycloakModule {}
