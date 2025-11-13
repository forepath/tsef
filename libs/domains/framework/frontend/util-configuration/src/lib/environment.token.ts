import { InjectionToken, Provider } from '@angular/core';
import { environment } from './environment';
import { Environment } from './environment.interface';

export const ENVIRONMENT = new InjectionToken<Environment>('Environment');

export function provideEnvironment(): Provider {
  return {
    provide: ENVIRONMENT,
    useFactory: () => environment,
    deps: [],
  };
}
