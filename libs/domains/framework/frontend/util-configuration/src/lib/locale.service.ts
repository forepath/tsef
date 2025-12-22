import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { ENVIRONMENT } from './environment.token';

@Injectable({
  providedIn: 'root',
})
export class LocaleService {
  private environment = inject(ENVIRONMENT);
  private platformId = inject(PLATFORM_ID);

  buildAbsoluteUrl(path: any[]): any[] {
    if (!this.environment.production) {
      return path;
    }

    if (!isPlatformBrowser(this.platformId)) {
      return path;
    }

    const locale = window.location.pathname.split('/')[1] ?? '';
    if (!locale) {
      return path;
    }

    path = path.map((p) => (p.startsWith('/') ? p.slice(1) : p));

    return ['/', locale, ...path];
  }
}
