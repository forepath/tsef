import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withRouterConfig } from '@angular/router';
import { getAuthInterceptor } from '@forepath/framework/frontend/data-access-agent-console';
import { provideEnvironment } from '@forepath/framework/frontend/util-configuration';
import { provideStore } from '@ngrx/store';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withInterceptors([getAuthInterceptor()])),
    // NgRx Store - base store required at root level
    provideStore(),
    provideRouter(
      [
        {
          path: '',
          loadChildren: () =>
            import('@forepath/framework/frontend/feature-agent-console').then((app) => app.agentConsoleRoutes),
        },
      ],
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
    ),
    provideEnvironment(),
  ],
};
