# Authentication Domain

This document provides comprehensive documentation for the Keycloak Authentication Domain, including usage examples, integration guides, and API references.

## Overview

The Authentication Domain provides a complete Keycloak integration solution for Angular frontends and NestJS backends, including state management capabilities for Angular applications. The domain follows the monorepo's domain-driven design principles and provides a clean, modular architecture.

## Domain Structure

```
libs/domains/auth/
├── shared/
│   ├── util-types/          # Framework-agnostic types and interfaces
│   └── util-validation/      # Validation schemas and utilities
├── frontend/
│   ├── data-access-keycloak/ # Angular Keycloak integration service
│   ├── feature-login/       # Login/logout workflows
│   ├── feature-state/       # NgRx state management
│   └── ui-login-form/       # Reusable login form component
└── backend/
    ├── data-access-keycloak/ # NestJS Keycloak integration
    └── feature-guards/      # Authentication guards and middleware
```

## Quick Start

### Angular Frontend Integration

1. **Install Dependencies**

```bash
npm install keycloak-angular keycloak-js @ngrx/store @ngrx/effects
```

2. **Configure Keycloak in AppModule**

```typescript
import { NgModule, APP_INITIALIZER } from '@angular/core';
import { KeycloakAngularModule, KeycloakService } from 'keycloak-angular';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { AuthKeycloakService } from '@auth/frontend/data-access-keycloak';
import { AuthFacade, authReducer } from '@auth/frontend/feature-state';

export function initializeKeycloak(keycloak: KeycloakService) {
  return () =>
    keycloak.init({
      config: {
        url: 'http://localhost:8080/auth',
        realm: 'your-realm',
        clientId: 'your-angular-client-id',
      },
      initOptions: {
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri: window.location.origin + '/assets/silent-check-sso.html',
      },
    });
}

@NgModule({
  imports: [KeycloakAngularModule, StoreModule.forRoot({ auth: authReducer }), EffectsModule.forRoot([])],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: initializeKeycloak,
      deps: [KeycloakService],
      multi: true,
    },
  ],
})
export class AppModule {}
```

3. **Use Authentication Services**

```typescript
import { Component } from '@angular/core';
import { AuthLoginService } from '@auth/frontend/feature-login';
import { AuthFacade } from '@auth/frontend/feature-state';
import { LoginRequest } from '@auth/shared/util-types';

@Component({
  selector: 'app-login',
  template: ` <auth-login-form [loading]="loading$ | async" [error]="error$ | async" (loginSubmit)="onLogin($event)" (errorClear)="onClearError()"> </auth-login-form> `,
})
export class LoginComponent {
  loading$ = this.authFacade.loading$;
  error$ = this.authFacade.error$;

  constructor(
    private authLoginService: AuthLoginService,
    private authFacade: AuthFacade,
  ) {}

  async onLogin(request: LoginRequest) {
    const response = await this.authLoginService.login(request);
    if (response.success) {
      // Handle successful login
      console.log('Login successful:', response.user);
    } else {
      // Handle login error
      console.error('Login failed:', response.error);
    }
  }

  onClearError() {
    this.authLoginService.clearError();
  }
}
```

### NestJS Backend Integration

1. **Install Dependencies**

```bash
npm install nest-keycloak-connect keycloak-connect @nestjs/config
```

2. **Configure Keycloak in AppModule**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KeycloakModule } from '@auth/backend/data-access-keycloak';
import { AuthGuard, RolesGuard } from '@auth/backend/feature-guards';

@Module({
  imports: [ConfigModule.forRoot(), KeycloakModule],
  providers: [
    {
      provide: 'APP_GUARD',
      useClass: AuthGuard,
    },
    {
      provide: 'APP_GUARD',
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
```

3. **Protect Routes with Guards**

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard, RolesGuard, Roles } from '@auth/backend/feature-guards';

@Controller('protected')
@UseGuards(AuthGuard, RolesGuard)
export class ProtectedController {
  @Get()
  @Roles('user')
  getProtectedResource() {
    return 'This is a protected resource';
  }

  @Get('admin')
  @Roles('admin')
  getAdminResource() {
    return 'This is an admin-only resource';
  }
}
```

## API Reference

### Shared Types (`@auth/shared/util-types`)

#### UserProfile

```typescript
interface UserProfile {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  groups: string[];
  attributes?: Record<string, any>;
}
```

#### AuthState

```typescript
interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  token: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  loading: boolean;
  error: string | null;
}
```

#### KeycloakConfig

```typescript
interface KeycloakConfig {
  url: string;
  realm: string;
  clientId: string;
}
```

### Shared Validation (`@auth/shared/util-validation`)

#### validateEmail

```typescript
function validateEmail(email: string): ValidationResult;
```

#### validatePassword

```typescript
function validatePassword(
  password: string,
  options?: {
    minLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumbers?: boolean;
    requireSpecialChars?: boolean;
  },
): ValidationResult;
```

#### validateLoginRequest

```typescript
function validateLoginRequest(request: { username?: string; email?: string; password?: string }): ValidationResult;
```

### Angular Services

#### AuthKeycloakService (`@auth/frontend/data-access-keycloak`)

```typescript
class AuthKeycloakService {
  async initialize(config: KeycloakConfig, initOptions?: KeycloakInitOptions): Promise<boolean>;
  async login(request: LoginRequest): Promise<LoginResponse>;
  async logout(request?: LogoutRequest): Promise<void>;
  async refreshToken(request: RefreshTokenRequest): Promise<RefreshTokenResponse>;
  async getUserProfile(): Promise<UserProfile | null>;
  getToken(): string | null;
  getUserRoles(): string[];
  hasRole(role: string): boolean;
  hasAnyRole(roles: string[]): boolean;
  hasAllRoles(roles: string[]): boolean;
  isAuthenticated(): boolean;
}
```

#### AuthLoginService (`@auth/frontend/feature-login`)

```typescript
class AuthLoginService {
  async login(request: LoginRequest): Promise<LoginResponse>;
  async logout(request?: LogoutRequest): Promise<void>;
  async refreshToken(request: RefreshTokenRequest): Promise<RefreshTokenResponse>;
  async getCurrentUser(): Promise<UserProfile | null>;
  getToken(): string | null;
  hasRole(role: string): boolean;
  hasAnyRole(roles: string[]): boolean;
  hasAllRoles(roles: string[]): boolean;
  clearError(): void;
}
```

#### AuthFacade (`@auth/frontend/feature-state`)

```typescript
class AuthFacade {
  // Selectors
  isAuthenticated$: Observable<boolean>;
  user$: Observable<UserProfile | null>;
  token$: Observable<string | null>;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;

  // Actions
  login(request: LoginRequest): void;
  logout(request?: LogoutRequest): void;
  refreshToken(request: RefreshTokenRequest): void;
  loadUser(): void;
  setLoading(loading: boolean): void;
  setError(error: string): void;
  clearError(): void;
  updateUser(user: UserProfile): void;
  setAuthenticated(isAuthenticated: boolean): void;
}
```

### Angular Components

#### AuthLoginFormComponent (`@auth/frontend/ui-login-form`)

```typescript
@Component({
  selector: 'auth-login-form',
  // ...
})
export class AuthLoginFormComponent {
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() allowEmailLogin = true;
  @Input() allowUsernameLogin = true;
  @Input() showRememberMe = true;
  @Input() submitButtonText = 'Login';
  @Input() usernameLabel = 'Username';
  @Input() passwordLabel = 'Password';
  @Input() rememberMeLabel = 'Remember me';

  @Output() loginSubmit = new EventEmitter<LoginRequest>();
  @Output() errorClear = new EventEmitter<void>();
}
```

### NestJS Services

#### KeycloakService (`@auth/backend/data-access-keycloak`)

```typescript
class KeycloakService {
  getKeycloakConfig(): KeycloakConfig;
  extractUserProfile(token: DecodedToken): UserProfile;
  isTokenExpired(token: DecodedToken): boolean;
  hasRole(token: DecodedToken, role: string): boolean;
  hasAnyRole(token: DecodedToken, roles: string[]): boolean;
  hasAllRoles(token: DecodedToken, roles: string[]): boolean;
  createAuthError(code: string, message: string, details?: any): AuthError;
}
```

### NestJS Guards

#### AuthGuard (`@auth/backend/feature-guards`)

```typescript
@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean>;
}
```

#### RolesGuard (`@auth/backend/feature-guards`)

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean>;
}
```

#### ResourceGuard (`@auth/backend/feature-guards`)

```typescript
@Injectable()
export class ResourceGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean>;
}
```

#### PermissionsGuard (`@auth/backend/feature-guards`)

```typescript
@Injectable()
export class PermissionsGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean>;
}
```

## Configuration

### Environment Variables

#### Frontend (Angular)

```typescript
// environment.ts
export const environment = {
  keycloak: {
    url: 'http://localhost:8080/auth',
    realm: 'your-realm',
    clientId: 'your-angular-client-id',
  },
};
```

#### Backend (NestJS)

```bash
# .env
KEYCLOAK_URL=http://localhost:8080/auth
KEYCLOAK_REALM=your-realm
KEYCLOAK_CLIENT_ID=your-nestjs-client-id
KEYCLOAK_CLIENT_SECRET=your-client-secret
```

### Keycloak Realm Configuration

1. **Create a Realm** in Keycloak Admin Console
2. **Create Clients**:
   - Angular Client (Public)
   - NestJS Client (Confidential)
3. **Configure Valid Redirect URIs**
4. **Set up Roles and Users**

## Examples

### Complete Angular Login Flow

```typescript
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthLoginService } from '@auth/frontend/feature-login';
import { AuthFacade } from '@auth/frontend/feature-state';
import { LoginRequest } from '@auth/shared/util-types';

@Component({
  selector: 'app-login',
  template: `
    <div class="login-container">
      <h2>Login</h2>
      <auth-login-form [loading]="loading$ | async" [error]="error$ | async" (loginSubmit)="onLogin($event)" (errorClear)="onClearError()"> </auth-login-form>
    </div>
  `,
})
export class LoginComponent implements OnInit {
  loading$ = this.authFacade.loading$;
  error$ = this.authFacade.error$;

  constructor(
    private authLoginService: AuthLoginService,
    private authFacade: AuthFacade,
    private router: Router,
  ) {}

  ngOnInit() {
    // Check if already authenticated
    if (this.authLoginService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  async onLogin(request: LoginRequest) {
    const response = await this.authLoginService.login(request);

    if (response.success) {
      // Redirect to dashboard or intended page
      this.router.navigate(['/dashboard']);
    }
    // Error handling is done by the component
  }

  onClearError() {
    this.authLoginService.clearError();
  }
}
```

### Complete NestJS Protected Controller

```typescript
import { Controller, Get, Post, Put, Delete, UseGuards, Request } from '@nestjs/common';
import { AuthGuard, RolesGuard, Roles, Resource, Permissions } from '@auth/backend/feature-guards';
import { UserProfile } from '@auth/shared/util-types';

@Controller('api/users')
@UseGuards(AuthGuard, RolesGuard)
export class UsersController {
  @Get()
  @Roles('admin', 'user')
  @Resource('users')
  @Permissions('read')
  async getUsers(@Request() req) {
    const userProfile: UserProfile = req.userProfile;
    // Return users based on user's permissions
    return { users: [], currentUser: userProfile };
  }

  @Get(':id')
  @Roles('admin', 'user')
  @Resource('users')
  @Permissions('read')
  async getUser(@Request() req, @Param('id') id: string) {
    const userProfile: UserProfile = req.userProfile;

    // Check if user can access this specific user
    if (userProfile.id !== id && !userProfile.roles.includes('admin')) {
      throw new ForbiddenException('You can only access your own profile');
    }

    return { user: { id, profile: userProfile } };
  }

  @Post()
  @Roles('admin')
  @Resource('users')
  @Permissions('create')
  async createUser(@Request() req, @Body() userData: any) {
    const userProfile: UserProfile = req.userProfile;
    // Create user logic
    return { message: 'User created', createdBy: userProfile.username };
  }

  @Put(':id')
  @Roles('admin', 'user')
  @Resource('users')
  @Permissions('update')
  async updateUser(@Request() req, @Param('id') id: string, @Body() userData: any) {
    const userProfile: UserProfile = req.userProfile;

    // Check ownership or admin role
    if (userProfile.id !== id && !userProfile.roles.includes('admin')) {
      throw new ForbiddenException('You can only update your own profile');
    }

    return { message: 'User updated', updatedBy: userProfile.username };
  }

  @Delete(':id')
  @Roles('admin')
  @Resource('users')
  @Permissions('delete')
  async deleteUser(@Request() req, @Param('id') id: string) {
    const userProfile: UserProfile = req.userProfile;
    return { message: 'User deleted', deletedBy: userProfile.username };
  }
}
```

## Testing

### Unit Tests

Each library includes comprehensive unit tests. Run tests with:

```bash
# Test all auth libraries
nx run-many -t test -p auth-*

# Test specific library
nx test auth-frontend-feature-login
```

### Integration Tests

Integration tests verify the complete authentication flow:

```bash
# Run integration tests
nx test auth-frontend-data-access-keycloak --testNamePattern="integration"
```

### E2E Tests

End-to-end tests verify the complete user authentication experience:

```bash
# Run e2e tests
nx e2e your-app-e2e
```

## Troubleshooting

### Common Issues

1. **Keycloak Connection Issues**
   - Verify Keycloak server is running
   - Check URL, realm, and client configuration
   - Ensure CORS is properly configured

2. **Token Expiration**
   - Implement automatic token refresh
   - Handle token expiration gracefully
   - Use silent SSO for seamless experience

3. **Role/Permission Issues**
   - Verify user roles in Keycloak
   - Check role mappings
   - Ensure proper guard configuration

### Debug Mode

Enable debug logging:

```typescript
// Angular
const keycloakConfig = {
  // ... other config
  enableLogging: true,
};

// NestJS
const keycloakConfig = {
  // ... other config
  logLevels: ['verbose'],
  useNestLogger: true,
};
```

## Contributing

When contributing to the authentication domain:

1. Follow the established patterns
2. Add comprehensive tests
3. Update documentation
4. Ensure backward compatibility
5. Follow the monorepo's coding standards

## License

This authentication domain is part of the monorepo and follows the same license terms.
