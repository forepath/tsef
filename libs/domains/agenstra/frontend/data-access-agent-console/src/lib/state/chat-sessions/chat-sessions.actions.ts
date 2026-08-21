import { createAction, props } from '@ngrx/store';

import type {
  AgentChatSessionSummaryDto,
  ChatSessionResponseDto,
  CreateChatSessionDto,
  ListChatSessionsParams,
  UpdateChatSessionDto,
} from './chat-sessions.types';

export const loadChatSessions = createAction(
  '[ChatSessions] Load Chat Sessions',
  props<{ clientId: string; agentId: string; params?: ListChatSessionsParams }>(),
);

export const loadChatSessionsSuccess = createAction(
  '[ChatSessions] Load Chat Sessions Success',
  props<{
    clientId: string;
    agentId: string;
    sessions: ChatSessionResponseDto[];
    primaryChatId?: string;
  }>(),
);

export const loadChatSessionsFailure = createAction(
  '[ChatSessions] Load Chat Sessions Failure',
  props<{ clientId: string; agentId: string; error: string }>(),
);

export const hydrateChatSessions = createAction(
  '[ChatSessions] Hydrate Chat Sessions',
  props<{
    clientId: string;
    agentId: string;
    chats: AgentChatSessionSummaryDto[];
    primaryChatId: string;
  }>(),
);

export const createChatSession = createAction(
  '[ChatSessions] Create Chat Session',
  props<{ clientId: string; agentId: string; createDto?: CreateChatSessionDto }>(),
);

export const createChatSessionSuccess = createAction(
  '[ChatSessions] Create Chat Session Success',
  props<{ clientId: string; agentId: string; session: ChatSessionResponseDto }>(),
);

export const createChatSessionFailure = createAction(
  '[ChatSessions] Create Chat Session Failure',
  props<{ clientId: string; agentId: string; error: string }>(),
);

export const updateChatSession = createAction(
  '[ChatSessions] Update Chat Session',
  props<{ clientId: string; agentId: string; chatId: string; updateDto: UpdateChatSessionDto }>(),
);

export const updateChatSessionSuccess = createAction(
  '[ChatSessions] Update Chat Session Success',
  props<{ clientId: string; agentId: string; session: ChatSessionResponseDto }>(),
);

export const updateChatSessionFailure = createAction(
  '[ChatSessions] Update Chat Session Failure',
  props<{ clientId: string; agentId: string; chatId: string; error: string }>(),
);

export const deleteChatSession = createAction(
  '[ChatSessions] Delete Chat Session',
  props<{ clientId: string; agentId: string; chatId: string }>(),
);

export const deleteChatSessionSuccess = createAction(
  '[ChatSessions] Delete Chat Session Success',
  props<{ clientId: string; agentId: string; chatId: string }>(),
);

export const deleteChatSessionFailure = createAction(
  '[ChatSessions] Delete Chat Session Failure',
  props<{ clientId: string; agentId: string; chatId: string; error: string }>(),
);

export const selectChatSession = createAction(
  '[ChatSessions] Select Chat Session',
  props<{ clientId: string; agentId: string; chatId: string; restore?: boolean }>(),
);

export const clearChatSessions = createAction(
  '[ChatSessions] Clear Chat Sessions',
  props<{ clientId: string; agentId: string }>(),
);
