import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, exhaustMap, filter, map, of, switchMap, withLatestFrom } from 'rxjs';

import { FilterRulesService } from '../../services/filter-rules.service';

import {
  createFilterRule,
  createFilterRuleFailure,
  createFilterRuleSuccess,
  deleteFilterRule,
  deleteFilterRuleFailure,
  deleteFilterRuleSuccess,
  loadFilterRules,
  loadFilterRulesFailure,
  loadFilterRulesSuccess,
  loadMoreFilterRules,
  loadMoreFilterRulesFailure,
  loadMoreFilterRulesSuccess,
  updateFilterRule,
  updateFilterRuleFailure,
  updateFilterRuleSuccess,
} from './filter-rules.actions';
import { selectFilterRulesState } from './filter-rules.selectors';

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

const FILTER_RULES_BATCH_SIZE = 10;

export const loadFilterRules$ = createEffect(
  (actions$ = inject(Actions), svc = inject(FilterRulesService)) => {
    return actions$.pipe(
      ofType(loadFilterRules),
      switchMap(() => {
        const batchParams = { limit: FILTER_RULES_BATCH_SIZE, offset: 0 };

        return svc.list(batchParams).pipe(
          map((rules) =>
            loadFilterRulesSuccess({
              rules,
              hasMore: rules.length === FILTER_RULES_BATCH_SIZE,
              nextOffset: rules.length,
            }),
          ),
          catchError((error) => of(loadFilterRulesFailure({ error: normalizeError(error) }))),
        );
      }),
    );
  },
  { functional: true },
);

export const loadMoreFilterRules$ = createEffect(
  (actions$ = inject(Actions), svc = inject(FilterRulesService), store = inject(Store)) => {
    return actions$.pipe(
      ofType(loadMoreFilterRules),
      withLatestFrom(store.select(selectFilterRulesState)),
      filter(([, state]) => state.hasMore && !state.loading),
      exhaustMap(([, state]) => {
        const batchParams = { limit: FILTER_RULES_BATCH_SIZE, offset: state.nextOffset };

        return svc.list(batchParams).pipe(
          map((rules) =>
            loadMoreFilterRulesSuccess({
              rules,
              hasMore: rules.length === FILTER_RULES_BATCH_SIZE,
              nextOffset: state.nextOffset + rules.length,
            }),
          ),
          catchError((error) => of(loadMoreFilterRulesFailure({ error: normalizeError(error) }))),
        );
      }),
    );
  },
  { functional: true },
);

export const createFilterRule$ = createEffect(
  (actions$ = inject(Actions), svc = inject(FilterRulesService)) => {
    return actions$.pipe(
      ofType(createFilterRule),
      switchMap(({ dto }) =>
        svc.create(dto).pipe(
          map((rule) => createFilterRuleSuccess({ rule })),
          catchError((error) => of(createFilterRuleFailure({ error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);

export const updateFilterRule$ = createEffect(
  (actions$ = inject(Actions), svc = inject(FilterRulesService)) => {
    return actions$.pipe(
      ofType(updateFilterRule),
      switchMap(({ id, dto }) =>
        svc.update(id, dto).pipe(
          map((rule) => updateFilterRuleSuccess({ rule })),
          catchError((error) => of(updateFilterRuleFailure({ error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);

export const deleteFilterRule$ = createEffect(
  (actions$ = inject(Actions), svc = inject(FilterRulesService)) => {
    return actions$.pipe(
      ofType(deleteFilterRule),
      switchMap(({ id }) =>
        svc.delete(id).pipe(
          map(() => deleteFilterRuleSuccess({ id })),
          catchError((error) => of(deleteFilterRuleFailure({ error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);
