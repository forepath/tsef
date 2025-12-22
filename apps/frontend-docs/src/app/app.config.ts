import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideRuntimeEnvironment } from '@forepath/framework/frontend/util-configuration';
import { cookieConfig } from '@forepath/framework/frontend/util-cookie-consent';
import { provideNgcCookieConsent } from 'ngx-cookieconsent';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(withEventReplay()),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes),
    provideHttpClient(withFetch()),
    ...provideRuntimeEnvironment(),
    provideNgcCookieConsent(cookieConfig),
  ],
};
