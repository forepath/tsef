import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';

import { SubscriptionsService } from '../../services/subscriptions.service';

import {
  cancelSubscription,
  cancelSubscriptionFailure,
  cancelSubscriptionSuccess,
  createSubscription,
  createSubscriptionFailure,
  createSubscriptionSuccess,
  loadSubscription,
  loadSubscriptionFailure,
  loadSubscriptions,
  loadSubscriptionsFailure,
  loadSubscriptionsSuccess,
  loadSubscriptionSuccess,
  loadMoreSubscriptions,
  loadMoreSubscriptionsFailure,
  loadMoreSubscriptionsSuccess,
  resumeSubscription,
  resumeSubscriptionFailure,
  resumeSubscriptionSuccess,
  withdrawSubscription,
  withdrawSubscriptionFailure,
  withdrawSubscriptionSuccess,
} from './subscriptions.actions';

function normalizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }

  return 'An unexpected error occurred';
}

const BATCH_SIZE = 10;

export const loadSubscriptions$ = createEffect(
  (actions$ = inject(Actions), subscriptionsService = inject(SubscriptionsService)) => {
    return actions$.pipe(
      ofType(loadSubscriptions),
      switchMap(({ params }) => {
        const batchParams = { limit: BATCH_SIZE, offset: 0, ...params };

        return subscriptionsService.listSubscriptions(batchParams).pipe(
          map((subscriptions) =>
            loadSubscriptionsSuccess({
              subscriptions,
              hasMore: subscriptions.length === BATCH_SIZE,
              nextOffset: subscriptions.length,
            }),
          ),
          catchError((error) => of(loadSubscriptionsFailure({ error: normalizeError(error) }))),
        );
      }),
    );
  },
  { functional: true },
);

export const loadMoreSubscriptions$ = createEffect(
  (actions$ = inject(Actions), subscriptionsService = inject(SubscriptionsService)) => {
    return actions$.pipe(
      ofType(loadMoreSubscriptions),
      switchMap(({ offset, params }) => {
        const batchParams = { limit: BATCH_SIZE, offset, ...params };

        return subscriptionsService.listSubscriptions(batchParams).pipe(
          map((subscriptions) =>
            loadMoreSubscriptionsSuccess({
              subscriptions,
              hasMore: subscriptions.length === BATCH_SIZE,
              nextOffset: offset + subscriptions.length,
            }),
          ),
          catchError((error) => of(loadMoreSubscriptionsFailure({ error: normalizeError(error) }))),
        );
      }),
    );
  },
  { functional: true },
);

export const loadSubscription$ = createEffect(
  (actions$ = inject(Actions), subscriptionsService = inject(SubscriptionsService)) => {
    return actions$.pipe(
      ofType(loadSubscription),
      switchMap(({ id }) =>
        subscriptionsService.getSubscription(id).pipe(
          map((subscription) => loadSubscriptionSuccess({ subscription })),
          catchError((error) => of(loadSubscriptionFailure({ error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);

export const createSubscription$ = createEffect(
  (actions$ = inject(Actions), subscriptionsService = inject(SubscriptionsService)) => {
    return actions$.pipe(
      ofType(createSubscription),
      switchMap(({ subscription }) =>
        subscriptionsService.createSubscription(subscription).pipe(
          map((createdSubscription) => createSubscriptionSuccess({ subscription: createdSubscription })),
          catchError((error) => of(createSubscriptionFailure({ error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);

export const cancelSubscription$ = createEffect(
  (actions$ = inject(Actions), subscriptionsService = inject(SubscriptionsService)) => {
    return actions$.pipe(
      ofType(cancelSubscription),
      switchMap(({ id, dto }) =>
        subscriptionsService.cancelSubscription(id, dto).pipe(
          map((subscription) => cancelSubscriptionSuccess({ subscription })),
          catchError((error) => of(cancelSubscriptionFailure({ error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);

export const withdrawSubscription$ = createEffect(
  (actions$ = inject(Actions), subscriptionsService = inject(SubscriptionsService)) => {
    return actions$.pipe(
      ofType(withdrawSubscription),
      switchMap(({ id, dto }) =>
        subscriptionsService.withdrawSubscription(id, dto).pipe(
          map((subscription) => withdrawSubscriptionSuccess({ subscription })),
          catchError((error) => of(withdrawSubscriptionFailure({ error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);

export const resumeSubscription$ = createEffect(
  (actions$ = inject(Actions), subscriptionsService = inject(SubscriptionsService)) => {
    return actions$.pipe(
      ofType(resumeSubscription),
      switchMap(({ id, dto }) =>
        subscriptionsService.resumeSubscription(id, dto).pipe(
          map((subscription) => resumeSubscriptionSuccess({ subscription })),
          catchError((error) => of(resumeSubscriptionFailure({ error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);
