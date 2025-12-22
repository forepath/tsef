import { APP_BASE_HREF } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { RouteReuseStrategy, provideRouter, withRouterConfig } from '@angular/router';
import { getAuthInterceptor } from '@forepath/framework/frontend/data-access-agent-console';
import { environment, provideLocale, provideRuntimeEnvironment } from '@forepath/framework/frontend/util-configuration';
import { provideKeycloak } from '@forepath/identity/frontend';
import { provideStore } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { ComponentReuseStrategy } from './strategies/component-reuse.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    // Provide environment first (required by Keycloak provider). At runtime this may be
    // overridden by /config while always falling back to build-time defaults.
    ...provideRuntimeEnvironment(),
    // Provide KeycloakService before HTTP client so interceptor can inject it
    ...(environment.authentication.type === 'keycloak' ? provideKeycloak() : []),
    // Provide HTTP client with auth interceptor (KeycloakService must be available)
    provideHttpClient(withInterceptors([getAuthInterceptor()])),
    // NgRx Store - base store required at root level
    provideStore(),
    // NgRx Store DevTools - only enabled in non-production environments
    ...(environment.production
      ? []
      : [
          provideStoreDevtools({
            maxAge: 25,
          }),
        ]),
    provideRouter(
      [
        ...(environment.production
          ? [
              {
                path: 'de',
                loadChildren: () =>
                  import('@forepath/framework/frontend/feature-agent-console').then((app) => app.agentConsoleRoutes),
              },
              {
                path: 'en',
                loadChildren: () =>
                  import('@forepath/framework/frontend/feature-agent-console').then((app) => app.agentConsoleRoutes),
              },
            ]
          : []),
        {
          path: '',
          loadChildren: () =>
            import('@forepath/framework/frontend/feature-agent-console').then((app) => app.agentConsoleRoutes),
        },
      ],
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
    ),
    // Custom RouteReuseStrategy to reuse component instances when navigating between routes with the same component
    { provide: RouteReuseStrategy, useClass: ComponentReuseStrategy },
    // Provide APP_BASE_HREF (defaults to '/' if not provided)
    { provide: APP_BASE_HREF, useValue: '/' },
    provideLocale(),
  ],
};
