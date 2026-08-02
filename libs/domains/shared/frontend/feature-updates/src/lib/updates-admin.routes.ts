import { CanActivateFn, Route } from '@angular/router';
import {
  AdminUpdatesFacade,
  adminUpdatesReducer,
  loadAdminUpdatesFull$,
  loadAdminUpdatesStatus$,
  pollAdminUpdatesAfterCheck$,
  triggerAdminUpdateCheck$,
} from '@forepath/shared/frontend/data-access-updates';
import { buildPageTitle } from '@forepath/shared/frontend/util-configuration';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';

import { UpdatesManagerComponent } from './updates-manager/updates-manager.component';

/**
 * Updates admin routes for use in consuming applications.
 *
 * The consuming application must provide:
 * - `UPDATES_ADMIN_ENVIRONMENT` token with `UpdatesAdminEnvironment` value
 *
 * @example
 * ```typescript
 * import { createUpdatesAdminRoutes, updatesAdminProviders } from '@forepath/shared/frontend/feature-updates';
 *
 * const appRoutes: Route[] = [
 *   {
 *     path: '',
 *     children: [
 *       ...createUpdatesAdminRoutes([authGuard, adminGuard]),
 *     ],
 *     providers: [
 *       ...updatesAdminProviders,
 *     ],
 *   },
 * ];
 * ```
 */
export function createUpdatesAdminRoutes(canActivate: CanActivateFn[], path = 'updates'): Route[] {
  return [
    {
      path,
      canActivate,
      component: UpdatesManagerComponent,
      title: () => buildPageTitle($localize`:@@featureUpdates-pageTitle:Updates`),
    },
  ];
}

/**
 * NgRx providers for shared updates admin state.
 */
export const updatesAdminProviders = [
  AdminUpdatesFacade,
  provideState('adminUpdates', adminUpdatesReducer),
  provideEffects({
    loadAdminUpdatesStatus$,
    loadAdminUpdatesFull$,
    triggerAdminUpdateCheck$,
    pollAdminUpdatesAfterCheck$,
  }),
];
