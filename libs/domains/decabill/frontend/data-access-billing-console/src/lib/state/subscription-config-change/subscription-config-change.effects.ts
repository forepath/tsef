import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';

import { SubscriptionsService } from '../../services/subscriptions.service';
import { toConfigChangeFailure } from '../../utils/config-change-error.utils';

import {
  loadConfigChangeEligibility,
  loadConfigChangeEligibilityFailure,
  loadConfigChangeEligibilitySuccess,
  previewConfigChange,
  previewConfigChangeFailure,
  previewConfigChangeSuccess,
  submitConfigChange,
  submitConfigChangeFailure,
  submitConfigChangeSuccess,
} from './subscription-config-change.actions';

export const loadConfigChangeEligibility$ = createEffect(
  (actions$ = inject(Actions), subscriptionsService = inject(SubscriptionsService)) => {
    return actions$.pipe(
      ofType(loadConfigChangeEligibility),
      switchMap(({ subscriptionId }) =>
        subscriptionsService.getConfigChangeEligibility(subscriptionId).pipe(
          map((eligibility) => loadConfigChangeEligibilitySuccess({ subscriptionId, eligibility })),
          catchError((error) => {
            const failure = toConfigChangeFailure(error);

            return of(loadConfigChangeEligibilityFailure({ error: failure.message, code: failure.code }));
          }),
        ),
      ),
    );
  },
  { functional: true },
);

export const previewConfigChange$ = createEffect(
  (actions$ = inject(Actions), subscriptionsService = inject(SubscriptionsService)) => {
    return actions$.pipe(
      ofType(previewConfigChange),
      switchMap(({ subscriptionId, request }) =>
        subscriptionsService.previewConfigChange(subscriptionId, request).pipe(
          map((preview) => previewConfigChangeSuccess({ preview })),
          catchError((error) => {
            const failure = toConfigChangeFailure(error);

            return of(previewConfigChangeFailure({ error: failure.message, code: failure.code }));
          }),
        ),
      ),
    );
  },
  { functional: true },
);

export const submitConfigChange$ = createEffect(
  (actions$ = inject(Actions), subscriptionsService = inject(SubscriptionsService)) => {
    return actions$.pipe(
      ofType(submitConfigChange),
      switchMap(({ subscriptionId, request }) =>
        subscriptionsService.submitConfigChange(subscriptionId, request).pipe(
          map((result) => submitConfigChangeSuccess({ result })),
          catchError((error) => {
            const failure = toConfigChangeFailure(error);

            return of(submitConfigChangeFailure({ error: failure.message, code: failure.code }));
          }),
        ),
      ),
    );
  },
  { functional: true },
);
