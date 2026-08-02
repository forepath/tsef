import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action, Store } from '@ngrx/store';
import { catchError, concat, map, Observable, of, switchMap, timer, withLatestFrom } from 'rxjs';

import { UpdatesService } from '../../services/updates.service';
import type { UpdatesStatusSummary } from '../../types/updates.types';

import {
  loadAdminUpdatesFull,
  loadAdminUpdatesFullFailure,
  loadAdminUpdatesFullSuccess,
  loadAdminUpdatesStatus,
  loadAdminUpdatesStatusFailure,
  loadAdminUpdatesStatusSuccess,
  triggerAdminUpdateCheck,
  triggerAdminUpdateCheckFailure,
  triggerAdminUpdateCheckSuccess,
} from './admin-updates.actions';
import { selectAdminUpdatesLastCheckAt } from './admin-updates.selectors';

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 15;

function normalizeError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    return error.error?.message ?? error.message ?? String(error.status);
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred';
}

function isPollingComplete(status: UpdatesStatusSummary, previousLastCheckAt: string | null): boolean {
  if (status.lastCheckStatus === 'success' || status.lastCheckStatus === 'failed') {
    return true;
  }

  return previousLastCheckAt !== status.lastCheckAt && status.lastCheckAt !== null;
}

export const loadAdminUpdatesStatus$ = createEffect(
  (actions$ = inject(Actions), svc = inject(UpdatesService)) => {
    return actions$.pipe(
      ofType(loadAdminUpdatesStatus),
      switchMap(() =>
        svc.getStatus().pipe(
          map((status) => loadAdminUpdatesStatusSuccess({ status })),
          catchError((error) => of(loadAdminUpdatesStatusFailure({ error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);

export const loadAdminUpdatesFull$ = createEffect(
  (actions$ = inject(Actions), svc = inject(UpdatesService)) => {
    return actions$.pipe(
      ofType(loadAdminUpdatesFull),
      switchMap(() =>
        svc.getFullState().pipe(
          map((fullState) => loadAdminUpdatesFullSuccess({ fullState })),
          catchError((error) => of(loadAdminUpdatesFullFailure({ error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);

export const triggerAdminUpdateCheck$ = createEffect(
  (actions$ = inject(Actions), svc = inject(UpdatesService), store = inject(Store)) => {
    return actions$.pipe(
      ofType(triggerAdminUpdateCheck),
      withLatestFrom(store.select(selectAdminUpdatesLastCheckAt)),
      switchMap(([, previousLastCheckAt]) =>
        svc.triggerCheck().pipe(
          map((result) => triggerAdminUpdateCheckSuccess({ result, previousLastCheckAt })),
          catchError((error) => of(triggerAdminUpdateCheckFailure({ error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);

export const pollAdminUpdatesAfterCheck$ = createEffect(
  (actions$ = inject(Actions), svc = inject(UpdatesService)) => {
    return actions$.pipe(
      ofType(triggerAdminUpdateCheckSuccess),
      switchMap(({ previousLastCheckAt }) => {
        const poll = (attempt: number): Observable<Action> => {
          const delay$ = attempt === 0 ? of(0) : timer(POLL_INTERVAL_MS);

          return delay$.pipe(
            switchMap(() => svc.getStatus()),
            switchMap((status) => {
              const done = isPollingComplete(status, previousLastCheckAt) || attempt >= MAX_POLL_ATTEMPTS - 1;

              if (done) {
                return of(loadAdminUpdatesStatusSuccess({ status }), loadAdminUpdatesFull());
              }

              return concat(of(loadAdminUpdatesStatusSuccess({ status })), poll(attempt + 1));
            }),
            catchError((error) => of(loadAdminUpdatesStatusFailure({ error: normalizeError(error) }))),
          );
        };

        return poll(0);
      }),
    );
  },
  { functional: true },
);
