import { KeycloakService } from './auth-backend-data-access-keycloak';
import { ConfigService } from '@nestjs/config';
import { DecodedToken } from '@auth/shared/util-types';

describe('KeycloakService', () => {
  let service: KeycloakService;
  let configService: ConfigService;

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        const config = {
          KEYCLOAK_URL: 'http://localhost:8080/auth',
          KEYCLOAK_REALM: 'test-realm',
          KEYCLOAK_CLIENT_ID: 'test-client',
        };
        return config[key] || defaultValue;
      }),
    } as any;

    service = new KeycloakService(configService);
  });

  describe('getKeycloakConfig', () => {
    it('should return keycloak configuration', () => {
      const config = service.getKeycloakConfig();

      expect(config.url).toBe('http://localhost:8080/auth');
      expect(config.realm).toBe('test-realm');
      expect(config.clientId).toBe('test-client');
    });
  });

  describe('extractUserProfile', () => {
    it('should extract user profile from token', () => {
      const token: DecodedToken = {
        sub: 'user123',
        iss: 'http://localhost:8080/auth/realms/test-realm',
        aud: 'test-client',
        exp: Date.now() / 1000 + 3600,
        iat: Date.now() / 1000,
        auth_time: Date.now() / 1000,
        session_state: 'session123',
        realm_access: {
          roles: ['user', 'admin'],
        },
        resource_access: {
          'test-client': {
            roles: ['client-role'],
          },
        },
        preferred_username: 'testuser',
        email: 'test@example.com',
        given_name: 'Test',
        family_name: 'User',
        name: 'Test User',
      };

      const userProfile = service.extractUserProfile(token);

      expect(userProfile.id).toBe('user123');
      expect(userProfile.username).toBe('testuser');
      expect(userProfile.email).toBe('test@example.com');
      expect(userProfile.firstName).toBe('Test');
      expect(userProfile.lastName).toBe('User');
      expect(userProfile.roles).toContain('user');
      expect(userProfile.roles).toContain('admin');
      expect(userProfile.roles).toContain('client-role');
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for valid token', () => {
      const token: DecodedToken = {
        sub: 'user123',
        iss: 'http://localhost:8080/auth/realms/test-realm',
        aud: 'test-client',
        exp: Date.now() / 1000 + 3600,
        iat: Date.now() / 1000,
        auth_time: Date.now() / 1000,
        session_state: 'session123',
      };

      expect(service.isTokenExpired(token)).toBe(false);
    });

    it('should return true for expired token', () => {
      const token: DecodedToken = {
        sub: 'user123',
        iss: 'http://localhost:8080/auth/realms/test-realm',
        aud: 'test-client',
        exp: Date.now() / 1000 - 3600,
        iat: Date.now() / 1000 - 7200,
        auth_time: Date.now() / 1000 - 7200,
        session_state: 'session123',
      };

      expect(service.isTokenExpired(token)).toBe(true);
    });
  });

  describe('hasRole', () => {
    it('should check if user has role', () => {
      const token: DecodedToken = {
        sub: 'user123',
        iss: 'http://localhost:8080/auth/realms/test-realm',
        aud: 'test-client',
        exp: Date.now() / 1000 + 3600,
        iat: Date.now() / 1000,
        auth_time: Date.now() / 1000,
        session_state: 'session123',
        realm_access: {
          roles: ['user', 'admin'],
        },
      };

      expect(service.hasRole(token, 'user')).toBe(true);
      expect(service.hasRole(token, 'admin')).toBe(true);
      expect(service.hasRole(token, 'guest')).toBe(false);
    });
  });
});
