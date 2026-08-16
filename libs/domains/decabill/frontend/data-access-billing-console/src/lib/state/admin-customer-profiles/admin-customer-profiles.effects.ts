import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, concatMap, from, map, of, switchMap, toArray } from 'rxjs';

import { AdminCustomerProfilesService } from '../../services/admin-customer-profiles.service';
import type { AdminCustomerProfileDetail } from '../../types/billing.types';

import {
  createAdminCustomerProfile,
  createAdminCustomerProfileFailure,
  createAdminCustomerProfileSuccess,
  deleteAdminCustomerProfile,
  deleteAdminCustomerProfileFailure,
  deleteAdminCustomerProfileSuccess,
  loadAdminCustomerProfiles,
  loadAdminCustomerProfilesBatch,
  loadAdminCustomerProfileTrustScore,
  loadAdminCustomerProfileTrustScoreFailure,
  loadAdminCustomerProfileTrustScoreSuccess,
  loadAdminCustomerProfilesFailure,
  loadAdminCustomerProfilesSuccess,
  recomputeAdminCustomerProfileTrustScore,
  recomputeAdminCustomerProfileTrustScoreFailure,
  recomputeAdminCustomerProfileTrustScoreSuccess,
  saveAdminCustomerProfileCustomData,
  saveAdminCustomerProfileCustomDataFailure,
  saveAdminCustomerProfileCustomDataSuccess,
  updateAdminCustomerProfile,
  updateAdminCustomerProfileFailure,
  updateAdminCustomerProfileSuccess,
} from './admin-customer-profiles.actions';

function normalizeError(error: unknown): string {
  if (error instanceof Error) return error.message;

  if (typeof error === 'string') return error;

  if (error && typeof error === 'object' && 'message' in error) return String(error.message);

  return 'An unexpected error occurred';
}

const BATCH_SIZE = 10;

type CustomDataMutation =
  | { type: 'add'; key: string; value: string }
  | { type: 'update'; key: string; value: string }
  | { type: 'delete'; key: string };

function buildCustomDataMutations(
  original: Record<string, string>,
  next: Record<string, string>,
): CustomDataMutation[] {
  const mutations: CustomDataMutation[] = [];
  const originalKeys = new Set(Object.keys(original));
  const nextKeys = new Set(Object.keys(next));

  for (const key of nextKeys) {
    if (!originalKeys.has(key)) {
      mutations.push({ type: 'add', key, value: next[key] });
    } else if (original[key] !== next[key]) {
      mutations.push({ type: 'update', key, value: next[key] });
    }
  }

  for (const key of originalKeys) {
    if (!nextKeys.has(key)) {
      mutations.push({ type: 'delete', key });
    }
  }

  return mutations;
}

export const loadAdminCustomerProfiles$ = createEffect(
  (actions$ = inject(Actions), service = inject(AdminCustomerProfilesService)) =>
    actions$.pipe(
      ofType(loadAdminCustomerProfiles),
      switchMap(({ search }) =>
        service.list({ limit: BATCH_SIZE, offset: 0, search }).pipe(
          switchMap((response) => {
            if (response.items.length === 0) {
              return of(loadAdminCustomerProfilesSuccess({ profiles: [] }));
            }

            if (response.items.length < BATCH_SIZE) {
              return of(loadAdminCustomerProfilesSuccess({ profiles: response.items }));
            }

            return of(
              loadAdminCustomerProfilesBatch({ offset: BATCH_SIZE, accumulatedProfiles: response.items, search }),
            );
          }),
          catchError((error) => of(loadAdminCustomerProfilesFailure({ error: normalizeError(error) }))),
        ),
      ),
    ),
  { functional: true },
);

export const loadAdminCustomerProfilesBatch$ = createEffect(
  (actions$ = inject(Actions), service = inject(AdminCustomerProfilesService)) =>
    actions$.pipe(
      ofType(loadAdminCustomerProfilesBatch),
      switchMap(({ offset, accumulatedProfiles, search }) =>
        service.list({ limit: BATCH_SIZE, offset, search }).pipe(
          switchMap((response) => {
            const newAccumulated = [...accumulatedProfiles, ...response.items];

            if (response.items.length === 0 || response.items.length < BATCH_SIZE) {
              return of(loadAdminCustomerProfilesSuccess({ profiles: newAccumulated }));
            }

            return of(
              loadAdminCustomerProfilesBatch({
                offset: offset + BATCH_SIZE,
                accumulatedProfiles: newAccumulated,
                search,
              }),
            );
          }),
          catchError((error) => of(loadAdminCustomerProfilesFailure({ error: normalizeError(error) }))),
        ),
      ),
    ),
  { functional: true },
);

export const createAdminCustomerProfile$ = createEffect(
  (actions$ = inject(Actions), service = inject(AdminCustomerProfilesService)) =>
    actions$.pipe(
      ofType(createAdminCustomerProfile),
      switchMap(({ dto }) =>
        service.create(dto).pipe(
          map((profile) => createAdminCustomerProfileSuccess({ profile })),
          catchError((error) => of(createAdminCustomerProfileFailure({ error: normalizeError(error) }))),
        ),
      ),
    ),
  { functional: true },
);

export const updateAdminCustomerProfile$ = createEffect(
  (actions$ = inject(Actions), service = inject(AdminCustomerProfilesService)) =>
    actions$.pipe(
      ofType(updateAdminCustomerProfile),
      switchMap(({ id, dto }) =>
        service.update(id, dto).pipe(
          map((profile) => updateAdminCustomerProfileSuccess({ profile })),
          catchError((error) => of(updateAdminCustomerProfileFailure({ error: normalizeError(error) }))),
        ),
      ),
    ),
  { functional: true },
);

export const deleteAdminCustomerProfile$ = createEffect(
  (actions$ = inject(Actions), service = inject(AdminCustomerProfilesService)) =>
    actions$.pipe(
      ofType(deleteAdminCustomerProfile),
      switchMap(({ id }) =>
        service.delete(id).pipe(
          map(() => deleteAdminCustomerProfileSuccess({ id })),
          catchError((error) => of(deleteAdminCustomerProfileFailure({ error: normalizeError(error) }))),
        ),
      ),
    ),
  { functional: true },
);

export const loadAdminCustomerProfileTrustScore$ = createEffect(
  (actions$ = inject(Actions), service = inject(AdminCustomerProfilesService)) =>
    actions$.pipe(
      ofType(loadAdminCustomerProfileTrustScore),
      switchMap(({ id }) =>
        service.getTrustScore(id).pipe(
          map((detail) => loadAdminCustomerProfileTrustScoreSuccess({ detail })),
          catchError((error) => of(loadAdminCustomerProfileTrustScoreFailure({ error: normalizeError(error) }))),
        ),
      ),
    ),
  { functional: true },
);

export const recomputeAdminCustomerProfileTrustScore$ = createEffect(
  (actions$ = inject(Actions), service = inject(AdminCustomerProfilesService)) =>
    actions$.pipe(
      ofType(recomputeAdminCustomerProfileTrustScore),
      switchMap(({ id }) =>
        service.recomputeTrustScore(id).pipe(
          map((detail) => recomputeAdminCustomerProfileTrustScoreSuccess({ detail })),
          catchError((error) => of(recomputeAdminCustomerProfileTrustScoreFailure({ error: normalizeError(error) }))),
        ),
      ),
    ),
  { functional: true },
);

export const saveAdminCustomerProfileCustomData$ = createEffect(
  (actions$ = inject(Actions), service = inject(AdminCustomerProfilesService)) =>
    actions$.pipe(
      ofType(saveAdminCustomerProfileCustomData),
      switchMap(({ id, original, next }) => {
        const mutations = buildCustomDataMutations(original, next);

        if (mutations.length === 0) {
          return service.getById(id).pipe(
            map((detail) => saveAdminCustomerProfileCustomDataSuccess({ detail })),
            catchError((error) => of(saveAdminCustomerProfileCustomDataFailure({ error: normalizeError(error) }))),
          );
        }

        return from(mutations).pipe(
          concatMap((mutation) => {
            if (mutation.type === 'add') {
              return service.addCustomData(id, { key: mutation.key, value: mutation.value });
            }

            if (mutation.type === 'update') {
              return service.updateCustomData(id, mutation.key, { value: mutation.value });
            }

            return service.deleteCustomData(id, mutation.key);
          }),
          toArray(),
          map((results: AdminCustomerProfileDetail[]) => {
            const detail = results[results.length - 1];

            return saveAdminCustomerProfileCustomDataSuccess({ detail });
          }),
          catchError((error) => of(saveAdminCustomerProfileCustomDataFailure({ error: normalizeError(error) }))),
        );
      }),
    ),
  { functional: true },
);
