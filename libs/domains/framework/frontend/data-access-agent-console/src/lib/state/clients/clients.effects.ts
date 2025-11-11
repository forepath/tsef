import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap, exhaustMap } from 'rxjs';
import { ClientsService } from '../../services/clients.service';
import {
  loadClients,
  loadClientsFailure,
  loadClientsSuccess,
  loadClient,
  loadClientFailure,
  loadClientSuccess,
  createClient,
  createClientFailure,
  createClientSuccess,
  updateClient,
  updateClientFailure,
  updateClientSuccess,
  deleteClient,
  deleteClientFailure,
  deleteClientSuccess,
  setActiveClient,
  setActiveClientFailure,
  setActiveClientSuccess,
} from './clients.actions';

/**
 * Normalizes error messages from HTTP errors.
 */
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

export const loadClients$ = createEffect(
  (actions$ = inject(Actions), clientsService = inject(ClientsService)) => {
    return actions$.pipe(
      ofType(loadClients),
      switchMap(({ params }) =>
        clientsService.listClients(params).pipe(
          map((clients) => loadClientsSuccess({ clients })),
          catchError((error) => of(loadClientsFailure({ error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);

export const loadClient$ = createEffect(
  (actions$ = inject(Actions), clientsService = inject(ClientsService)) => {
    return actions$.pipe(
      ofType(loadClient),
      switchMap(({ id }) =>
        clientsService.getClient(id).pipe(
          map((client) => loadClientSuccess({ client })),
          catchError((error) => of(loadClientFailure({ error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);

export const createClient$ = createEffect(
  (actions$ = inject(Actions), clientsService = inject(ClientsService)) => {
    return actions$.pipe(
      ofType(createClient),
      exhaustMap(({ client }) =>
        clientsService.createClient(client).pipe(
          map((createdClient) => createClientSuccess({ client: createdClient })),
          catchError((error) => of(createClientFailure({ error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);

export const updateClient$ = createEffect(
  (actions$ = inject(Actions), clientsService = inject(ClientsService)) => {
    return actions$.pipe(
      ofType(updateClient),
      exhaustMap(({ id, client }) =>
        clientsService.updateClient(id, client).pipe(
          map((updatedClient) => updateClientSuccess({ client: updatedClient })),
          catchError((error) => of(updateClientFailure({ error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);

export const deleteClient$ = createEffect(
  (actions$ = inject(Actions), clientsService = inject(ClientsService)) => {
    return actions$.pipe(
      ofType(deleteClient),
      exhaustMap(({ id }) =>
        clientsService.deleteClient(id).pipe(
          map(() => deleteClientSuccess({ id })),
          catchError((error) => of(deleteClientFailure({ error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);

export const setActiveClient$ = createEffect(
  (actions$ = inject(Actions)) => {
    return actions$.pipe(
      ofType(setActiveClient),
      exhaustMap(({ id }) => {
        // For now, setActiveClient is a local state operation
        // If it requires an API call in the future, inject the service here
        return of(setActiveClientSuccess({ id }));
      }),
    );
  },
  { functional: true },
);
