import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, exhaustMap, filter, map, of, switchMap } from 'rxjs';
import { AgentsService } from '../../services/agents.service';
import { listDirectory, listDirectoryFailure, listDirectorySuccess } from '../files/files.actions';
import type { FileNodeDto } from '../files/files.types';
import {
  createClientAgent,
  createClientAgentFailure,
  createClientAgentSuccess,
  deleteClientAgent,
  deleteClientAgentFailure,
  deleteClientAgentSuccess,
  loadClientAgent,
  loadClientAgentCommands,
  loadClientAgentCommandsSuccess,
  loadClientAgentFailure,
  loadClientAgents,
  loadClientAgentsBatch,
  loadClientAgentsFailure,
  loadClientAgentsSuccess,
  loadClientAgentSuccess,
  updateClientAgent,
  updateClientAgentFailure,
  updateClientAgentSuccess,
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

const BATCH_SIZE = 10;

export const loadClientAgents$ = createEffect(
  (actions$ = inject(Actions), agentsService = inject(AgentsService)) => {
    return actions$.pipe(
      ofType(loadClientAgents),
      switchMap(({ clientId }) => {
        // Start with offset 0, limit 10, ignore user params for batch loading
        const batchParams = { limit: BATCH_SIZE, offset: 0 };
        return agentsService.listClientAgents(clientId, batchParams).pipe(
          switchMap((agents) => {
            if (agents.length === 0) {
              // No entries, dispatch success with empty array
              return of(loadClientAgentsSuccess({ clientId, agents: [] }));
            }
            // Has entries, check if we got a full batch (might be more)
            if (agents.length < BATCH_SIZE) {
              // Partial batch, we're done
              return of(loadClientAgentsSuccess({ clientId, agents }));
            }
            // Full batch, load next batch
            return of(loadClientAgentsBatch({ clientId, offset: BATCH_SIZE, accumulatedAgents: agents }));
          }),
          catchError((error) => of(loadClientAgentsFailure({ clientId, error: normalizeError(error) }))),
        );
      }),
    );
  },
  { functional: true },
);

export const loadClientAgentsBatch$ = createEffect(
  (actions$ = inject(Actions), agentsService = inject(AgentsService)) => {
    return actions$.pipe(
      ofType(loadClientAgentsBatch),
      switchMap(({ clientId, offset, accumulatedAgents }) => {
        const batchParams = { limit: BATCH_SIZE, offset };
        return agentsService.listClientAgents(clientId, batchParams).pipe(
          switchMap((agents) => {
            const newAccumulated = [...accumulatedAgents, ...agents];
            if (agents.length === 0) {
              // No more entries, dispatch success with all accumulated
              return of(loadClientAgentsSuccess({ clientId, agents: newAccumulated }));
            }
            // Has entries, check if we got a full batch (might be more)
            if (agents.length < BATCH_SIZE) {
              // Partial batch, we're done
              return of(loadClientAgentsSuccess({ clientId, agents: newAccumulated }));
            }
            // Full batch, load next batch
            return of(
              loadClientAgentsBatch({ clientId, offset: offset + BATCH_SIZE, accumulatedAgents: newAccumulated }),
            );
          }),
          catchError((error) => of(loadClientAgentsFailure({ clientId, error: normalizeError(error) }))),
        );
      }),
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

/**
 * Effect that sets loading state when directory listing for .cursor/commands starts.
 */
export const loadClientAgentCommandsLoading$ = createEffect(
  (actions$ = inject(Actions)) => {
    return actions$.pipe(
      ofType(listDirectory),
      filter(({ params }) => {
        // Normalize path for comparison (handle both '.cursor/commands' and './.cursor/commands')
        const path = params?.path || '';
        const normalized = path.replace(/^\.\//, '').replace(/\/$/, '');
        return normalized === '.cursor/commands' || normalized === 'cursor/commands';
      }),
      map(({ clientId, agentId }) => loadClientAgentCommands({ clientId, agentId })),
    );
  },
  { functional: true },
);

/**
 * Effect that listens to files directory listing success/failure for .cursor/commands
 * and extracts .md files as commands.
 */
export const loadClientAgentCommandsFromFiles$ = createEffect(
  (actions$ = inject(Actions)) => {
    return actions$.pipe(
      ofType(listDirectorySuccess, listDirectoryFailure),
      filter(({ directoryPath }) => {
        // Normalize path for comparison (handle both '.cursor/commands' and './.cursor/commands')
        const normalized = directoryPath.replace(/^\.\//, '').replace(/\/$/, '');
        return normalized === '.cursor/commands' || normalized === 'cursor/commands';
      }),
      map((action) => {
        if (action.type === '[Files] List Directory Success') {
          const { clientId, agentId, files } = action;
          // Filter for .md files (type === 'file' and name ends with .md)
          const commandFiles = files.filter((file: FileNodeDto) => file.type === 'file' && file.name.endsWith('.md'));

          // Extract command names: remove .md extension and prefix with /
          const commands = commandFiles.map((file: FileNodeDto) => {
            const commandName = file.name.replace(/\.md$/, '');
            return `/${commandName}`;
          });

          return loadClientAgentCommandsSuccess({ clientId, agentId, commands });
        } else {
          // If directory listing fails, assume no commands (per requirement)
          const { clientId, agentId } = action;
          return loadClientAgentCommandsSuccess({ clientId, agentId, commands: [] });
        }
      }),
    );
  },
  { functional: true },
);
