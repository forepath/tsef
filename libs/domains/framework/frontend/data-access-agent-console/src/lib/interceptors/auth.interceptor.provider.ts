import { HttpInterceptorFn } from '@angular/common/http';
import { authInterceptor } from './auth.interceptor';

/**
 * Returns the authentication HTTP interceptor function.
 * Use this with `withInterceptors` from `@angular/common/http` to enable
 * conditional API key or Keycloak authentication for API requests.
 *
 * @example
 * ```typescript
 * import { provideHttpClient, withInterceptors } from '@angular/common/http';
 * import { getAuthInterceptor } from '@forepath/framework/frontend/data-access-agent-console';
 *
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     provideHttpClient(withInterceptors([getAuthInterceptor()])),
 *     // ... other providers
 *   ],
 * });
 * ```
 *
 * @returns The authentication interceptor function
 */
export function getAuthInterceptor(): HttpInterceptorFn {
  return authInterceptor;
}
