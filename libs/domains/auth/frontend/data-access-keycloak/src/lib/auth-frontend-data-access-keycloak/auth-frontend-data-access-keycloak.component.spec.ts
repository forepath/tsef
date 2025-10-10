import { TestBed } from '@angular/core/testing';
import { KeycloakService } from 'keycloak-angular';
import { AuthKeycloakService } from './auth-keycloak.service';

describe('AuthKeycloakService', () => {
  let service: AuthKeycloakService;
  let keycloakService: KeycloakService;

  beforeEach(() => {
    const keycloakServiceMock = {
      init: jest.fn().mockResolvedValue(true),
      login: jest.fn().mockResolvedValue(undefined),
      logout: jest.fn().mockResolvedValue(undefined),
      updateToken: jest.fn().mockResolvedValue(true),
      loadUserProfile: jest.fn().mockResolvedValue({
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      }),
      getToken: jest.fn().mockReturnValue('token123'),
      getUserRoles: jest.fn().mockReturnValue(['user']),
      isLoggedIn: jest.fn().mockReturnValue(true),
      isUserInRole: jest.fn().mockReturnValue(true),
      getKeycloakInstance: jest.fn().mockReturnValue({
        tokenParsed: {
          sub: 'user123',
          exp: Date.now() / 1000 + 3600,
          realm_access: { roles: ['user'] }
        }
      })
    };

    TestBed.configureTestingModule({
      providers: [
        AuthKeycloakService,
        { provide: KeycloakService, useValue: keycloakServiceMock }
      ]
    });

    service = TestBed.inject(AuthKeycloakService);
    keycloakService = TestBed.inject(KeycloakService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize keycloak', async () => {
    const config = {
      url: 'http://localhost:8080/auth',
      realm: 'test-realm',
      clientId: 'test-client'
    };

    const result = await service.initialize(config);

    expect(result).toBe(true);
    expect(keycloakService.init).toHaveBeenCalled();
  });

  it('should login user', async () => {
    const loginRequest = {
      username: 'testuser',
      password: 'password123'
    };

    const result = await service.login(loginRequest);

    expect(result.success).toBe(true);
    expect(keycloakService.login).toHaveBeenCalled();
  });

  it('should logout user', async () => {
    await service.logout();

    expect(keycloakService.logout).toHaveBeenCalled();
  });

  it('should check if user is authenticated', () => {
    const isAuthenticated = service.isAuthenticated();

    expect(isAuthenticated).toBe(true);
    expect(keycloakService.isLoggedIn).toHaveBeenCalled();
  });

  it('should get user roles', () => {
    const roles = service.getUserRoles();

    expect(roles).toEqual(['user']);
    expect(keycloakService.getUserRoles).toHaveBeenCalled();
  });

  it('should check if user has role', () => {
    const hasRole = service.hasRole('user');

    expect(hasRole).toBe(true);
    expect(keycloakService.isUserInRole).toHaveBeenCalledWith('user');
  });
});
