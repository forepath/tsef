import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap, exhaustMap } from 'rxjs';
import { AgentsService } from '../../services/agents.service';
import {
  loadClientAgents,
  loadClientAgentsFailure,
  loadClientAgentsSuccess,
  loadClientAgent,
  loadClientAgentFailure,
  loadClientAgentSuccess,
  createClientAgent,
  createClientAgentFailure,
  createClientAgentSuccess,
  updateClientAgent,
  updateClientAgentFailure,
  updateClientAgentSuccess,
  deleteClientAgent,
  deleteClientAgentFailure,
  deleteClientAgentSuccess,
} from './agents.actions';

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

export const loadClientAgents$ = createEffect(
  (actions$ = inject(Actions), agentsService = inject(AgentsService)) => {
    return actions$.pipe(
      ofType(loadClientAgents),
      switchMap(({ clientId, params }) =>
        agentsService.listClientAgents(clientId, params).pipe(
          map((agents) => loadClientAgentsSuccess({ clientId, agents })),
          catchError((error) => of(loadClientAgentsFailure({ clientId, error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);

export const loadClientAgent$ = createEffect(
  (actions$ = inject(Actions), agentsService = inject(AgentsService)) => {
    return actions$.pipe(
      ofType(loadClientAgent),
      switchMap(({ clientId, agentId }) =>
        agentsService.getClientAgent(clientId, agentId).pipe(
          map((agent) => loadClientAgentSuccess({ clientId, agent })),
          catchError((error) => of(loadClientAgentFailure({ clientId, error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);

export const createClientAgent$ = createEffect(
  (actions$ = inject(Actions), agentsService = inject(AgentsService)) => {
    return actions$.pipe(
      ofType(createClientAgent),
      exhaustMap(({ clientId, agent }) =>
        agentsService.createClientAgent(clientId, agent).pipe(
          map((createdAgent) => createClientAgentSuccess({ clientId, agent: createdAgent })),
          catchError((error) => of(createClientAgentFailure({ clientId, error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);

export const updateClientAgent$ = createEffect(
  (actions$ = inject(Actions), agentsService = inject(AgentsService)) => {
    return actions$.pipe(
      ofType(updateClientAgent),
      exhaustMap(({ clientId, agentId, agent }) =>
        agentsService.updateClientAgent(clientId, agentId, agent).pipe(
          map((updatedAgent) => updateClientAgentSuccess({ clientId, agent: updatedAgent })),
          catchError((error) => of(updateClientAgentFailure({ clientId, error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);

export const deleteClientAgent$ = createEffect(
  (actions$ = inject(Actions), agentsService = inject(AgentsService)) => {
    return actions$.pipe(
      ofType(deleteClientAgent),
      exhaustMap(({ clientId, agentId }) =>
        agentsService.deleteClientAgent(clientId, agentId).pipe(
          map(() => deleteClientAgentSuccess({ clientId, agentId })),
          catchError((error) => of(deleteClientAgentFailure({ clientId, error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);
