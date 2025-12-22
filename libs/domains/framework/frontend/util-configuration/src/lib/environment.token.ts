import { HttpClient } from '@angular/common/http';
import { APP_INITIALIZER, InjectionToken, Provider } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from './environment';
import { Environment } from './environment.interface';

export const ENVIRONMENT = new InjectionToken<Environment>('Environment');

/**
 * Runtime environment instance that can be overridden by remote configuration.
 * Falls back to the build-time environment by default.
 */
let runtimeEnvironment: Environment = environment;

function mergeEnvironmentOverrides(base: Environment, overrides: Partial<Environment> | null | undefined): Environment {
  if (!overrides) {
    return base;
  }

  // Shallow merge is sufficient for our use cases; we trust remote config to provide full objects
  // where necessary. We assert the type to avoid over-constraining optional fields.
  return {
    ...base,
    ...overrides,
  } as Environment;
}

export function loadRuntimeEnvironment(http: HttpClient): () => Promise<void> {
  return async () => {
    try {
      const remoteConfig = await firstValueFrom(
        http.get<Partial<Environment>>('/config', {
          responseType: 'json',
        }),
      );

      runtimeEnvironment = mergeEnvironmentOverrides(environment, remoteConfig);
    } catch (error) {
      // If the /config endpoint is not available or returns an error,
      // fall back to the build-time environment.
      // eslint-disable-next-line no-console
      console.warn(
        'Runtime configuration could not be loaded from /config. Falling back to default environment.',
        error,
      );
      runtimeEnvironment = environment;
    }
  };
}

export function provideEnvironment(): Provider {
  return {
    provide: ENVIRONMENT,
    useFactory: () => environment,
    deps: [],
  };
}

/**
 * Provides the ENVIRONMENT token backed by runtime configuration loaded from the
 * server's /config endpoint. If the endpoint is unavailable or misconfigured,
 * the build-time environment is used as a safe fallback.
 */
export function provideRuntimeEnvironment(): Provider[] {
  return [
    {
      provide: APP_INITIALIZER,
      useFactory: (http: HttpClient) => loadRuntimeEnvironment(http),
      deps: [HttpClient],
      multi: true,
    },
    {
      provide: ENVIRONMENT,
      useFactory: () => runtimeEnvironment,
      deps: [],
    },
  ];
}
