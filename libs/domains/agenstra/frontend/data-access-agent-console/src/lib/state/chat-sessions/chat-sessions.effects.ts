import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, exhaustMap, map, of, switchMap } from 'rxjs';

import { ChatSessionsService } from '../../services/chat-sessions.service';

import {
  createChatSession,
  createChatSessionFailure,
  createChatSessionSuccess,
  deleteChatSession,
  deleteChatSessionFailure,
  deleteChatSessionSuccess,
  loadChatSessions,
  loadChatSessionsFailure,
  loadChatSessionsSuccess,
  updateChatSession,
  updateChatSessionFailure,
  updateChatSessionSuccess,
} from './chat-sessions.actions';

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

export const loadChatSessions$ = createEffect(
  (actions$ = inject(Actions), chatSessionsService = inject(ChatSessionsService)) => {
    return actions$.pipe(
      ofType(loadChatSessions),
      switchMap(({ clientId, agentId, params }) =>
        chatSessionsService.listChatSessions(clientId, agentId, params).pipe(
          map((sessions) => {
            const primaryChatId = sessions.find((session) => session.kind === 'primary')?.id;

            return loadChatSessionsSuccess({ clientId, agentId, sessions, primaryChatId });
          }),
          catchError((error) => of(loadChatSessionsFailure({ clientId, agentId, error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);

export const createChatSession$ = createEffect(
  (actions$ = inject(Actions), chatSessionsService = inject(ChatSessionsService)) => {
    return actions$.pipe(
      ofType(createChatSession),
      exhaustMap(({ clientId, agentId, createDto }) =>
        chatSessionsService.createChatSession(clientId, agentId, createDto ?? {}).pipe(
          map((session) => createChatSessionSuccess({ clientId, agentId, session })),
          catchError((error) => of(createChatSessionFailure({ clientId, agentId, error: normalizeError(error) }))),
        ),
      ),
    );
  },
  { functional: true },
);

export const updateChatSession$ = createEffect(
  (actions$ = inject(Actions), chatSessionsService = inject(ChatSessionsService)) => {
    return actions$.pipe(
      ofType(updateChatSession),
      exhaustMap(({ clientId, agentId, chatId, updateDto }) =>
        chatSessionsService.updateChatSession(clientId, agentId, chatId, updateDto).pipe(
          map((session) => updateChatSessionSuccess({ clientId, agentId, session })),
          catchError((error) =>
            of(updateChatSessionFailure({ clientId, agentId, chatId, error: normalizeError(error) })),
          ),
        ),
      ),
    );
  },
  { functional: true },
);

export const deleteChatSession$ = createEffect(
  (actions$ = inject(Actions), chatSessionsService = inject(ChatSessionsService)) => {
    return actions$.pipe(
      ofType(deleteChatSession),
      exhaustMap(({ clientId, agentId, chatId }) =>
        chatSessionsService.deleteChatSession(clientId, agentId, chatId).pipe(
          map(() => deleteChatSessionSuccess({ clientId, agentId, chatId })),
          catchError((error) =>
            of(deleteChatSessionFailure({ clientId, agentId, chatId, error: normalizeError(error) })),
          ),
        ),
      ),
    );
  },
  { functional: true },
);
