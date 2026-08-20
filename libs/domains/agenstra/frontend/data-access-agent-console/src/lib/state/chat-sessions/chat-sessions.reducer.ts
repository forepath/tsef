import { createReducer, on } from '@ngrx/store';

import {
  clearChatSessions,
  createChatSession,
  createChatSessionFailure,
  createChatSessionSuccess,
  deleteChatSession,
  deleteChatSessionFailure,
  deleteChatSessionSuccess,
  hydrateChatSessions,
  loadChatSessions,
  loadChatSessionsFailure,
  loadChatSessionsSuccess,
  selectChatSession,
  updateChatSession,
  updateChatSessionFailure,
  updateChatSessionSuccess,
} from './chat-sessions.actions';
import type { AgentChatSessionSummaryDto, ChatSessionResponseDto } from './chat-sessions.types';

export interface ChatSessionsState {
  /** Sessions keyed by clientId:agentId */
  sessions: Record<string, ChatSessionResponseDto[]>;
  /** Selected chat id keyed by clientId:agentId */
  selectedChatIds: Record<string, string | null>;
  loading: Record<string, boolean>;
  creating: Record<string, boolean>;
  updating: Record<string, boolean>;
  deleting: Record<string, boolean>;
  errors: Record<string, string | null>;
}

export const initialChatSessionsState: ChatSessionsState = {
  sessions: {},
  selectedChatIds: {},
  loading: {},
  creating: {},
  updating: {},
  deleting: {},
  errors: {},
};

export function getClientAgentKey(clientId: string, agentId: string): string {
  return `${clientId}:${agentId}`;
}

function getChatKey(clientId: string, agentId: string, chatId: string): string {
  return `${clientId}:${agentId}:${chatId}`;
}

function mapSummariesToSessions(agentId: string, chats: AgentChatSessionSummaryDto[]): ChatSessionResponseDto[] {
  return chats.map((chat) => ({
    id: chat.id,
    agentId,
    title: chat.title,
    kind: chat.kind,
    lastMessageAt: chat.lastMessageAt,
    createdAt: chat.createdAt,
    updatedAt: chat.createdAt,
  }));
}

function resolvePrimaryChatId(sessions: ChatSessionResponseDto[], preferred?: string): string | null {
  if (preferred && sessions.some((session) => session.id === preferred)) {
    return preferred;
  }

  const primary = sessions.find((session) => session.kind === 'primary');

  return primary?.id ?? sessions[0]?.id ?? null;
}

export const chatSessionsReducer = createReducer(
  initialChatSessionsState,
  on(loadChatSessions, (state, { clientId, agentId }) => {
    const key = getClientAgentKey(clientId, agentId);

    return {
      ...state,
      loading: { ...state.loading, [key]: true },
      errors: { ...state.errors, [key]: null },
    };
  }),
  on(loadChatSessionsSuccess, (state, { clientId, agentId, sessions, primaryChatId }) => {
    const key = getClientAgentKey(clientId, agentId);
    const nextSelected =
      state.selectedChatIds[key] && sessions.some((session) => session.id === state.selectedChatIds[key])
        ? state.selectedChatIds[key]
        : resolvePrimaryChatId(sessions, primaryChatId);

    return {
      ...state,
      sessions: { ...state.sessions, [key]: sessions },
      selectedChatIds: { ...state.selectedChatIds, [key]: nextSelected },
      loading: { ...state.loading, [key]: false },
      errors: { ...state.errors, [key]: null },
    };
  }),
  on(loadChatSessionsFailure, (state, { clientId, agentId, error }) => {
    const key = getClientAgentKey(clientId, agentId);

    return {
      ...state,
      loading: { ...state.loading, [key]: false },
      errors: { ...state.errors, [key]: error },
    };
  }),
  on(hydrateChatSessions, (state, { clientId, agentId, chats, primaryChatId }) => {
    const key = getClientAgentKey(clientId, agentId);
    const sessions = mapSummariesToSessions(agentId, chats);
    const nextSelected =
      state.selectedChatIds[key] && sessions.some((session) => session.id === state.selectedChatIds[key])
        ? state.selectedChatIds[key]
        : resolvePrimaryChatId(sessions, primaryChatId);

    return {
      ...state,
      sessions: { ...state.sessions, [key]: sessions },
      selectedChatIds: { ...state.selectedChatIds, [key]: nextSelected },
      errors: { ...state.errors, [key]: null },
    };
  }),
  on(createChatSession, (state, { clientId, agentId }) => {
    const key = getClientAgentKey(clientId, agentId);

    return {
      ...state,
      creating: { ...state.creating, [key]: true },
      errors: { ...state.errors, [key]: null },
    };
  }),
  on(createChatSessionSuccess, (state, { clientId, agentId, session }) => {
    const key = getClientAgentKey(clientId, agentId);
    const current = state.sessions[key] ?? [];

    return {
      ...state,
      sessions: { ...state.sessions, [key]: [...current, session] },
      selectedChatIds: { ...state.selectedChatIds, [key]: session.id },
      creating: { ...state.creating, [key]: false },
      errors: { ...state.errors, [key]: null },
    };
  }),
  on(createChatSessionFailure, (state, { clientId, agentId, error }) => {
    const key = getClientAgentKey(clientId, agentId);

    return {
      ...state,
      creating: { ...state.creating, [key]: false },
      errors: { ...state.errors, [key]: error },
    };
  }),
  on(updateChatSession, (state, { clientId, agentId, chatId }) => {
    const chatKey = getChatKey(clientId, agentId, chatId);

    return {
      ...state,
      updating: { ...state.updating, [chatKey]: true },
      errors: { ...state.errors, [chatKey]: null },
    };
  }),
  on(updateChatSessionSuccess, (state, { clientId, agentId, session }) => {
    const key = getClientAgentKey(clientId, agentId);
    const chatKey = getChatKey(clientId, agentId, session.id);
    const current = state.sessions[key] ?? [];

    return {
      ...state,
      sessions: {
        ...state.sessions,
        [key]: current.map((item) => (item.id === session.id ? session : item)),
      },
      updating: { ...state.updating, [chatKey]: false },
      errors: { ...state.errors, [chatKey]: null },
    };
  }),
  on(updateChatSessionFailure, (state, { clientId, agentId, chatId, error }) => {
    const chatKey = getChatKey(clientId, agentId, chatId);

    return {
      ...state,
      updating: { ...state.updating, [chatKey]: false },
      errors: { ...state.errors, [chatKey]: error },
    };
  }),
  on(deleteChatSession, (state, { clientId, agentId, chatId }) => {
    const chatKey = getChatKey(clientId, agentId, chatId);

    return {
      ...state,
      deleting: { ...state.deleting, [chatKey]: true },
      errors: { ...state.errors, [chatKey]: null },
    };
  }),
  on(deleteChatSessionSuccess, (state, { clientId, agentId, chatId }) => {
    const key = getClientAgentKey(clientId, agentId);
    const chatKey = getChatKey(clientId, agentId, chatId);
    const current = state.sessions[key] ?? [];
    const nextSessions = current.filter((session) => session.id !== chatId);
    const wasSelected = state.selectedChatIds[key] === chatId;

    return {
      ...state,
      sessions: { ...state.sessions, [key]: nextSessions },
      selectedChatIds: {
        ...state.selectedChatIds,
        [key]: wasSelected ? resolvePrimaryChatId(nextSessions) : state.selectedChatIds[key],
      },
      deleting: { ...state.deleting, [chatKey]: false },
      errors: { ...state.errors, [chatKey]: null },
    };
  }),
  on(deleteChatSessionFailure, (state, { clientId, agentId, chatId, error }) => {
    const chatKey = getChatKey(clientId, agentId, chatId);

    return {
      ...state,
      deleting: { ...state.deleting, [chatKey]: false },
      errors: { ...state.errors, [chatKey]: error },
    };
  }),
  on(selectChatSession, (state, { clientId, agentId, chatId }) => {
    const key = getClientAgentKey(clientId, agentId);

    return {
      ...state,
      selectedChatIds: { ...state.selectedChatIds, [key]: chatId },
    };
  }),
  on(clearChatSessions, (state, { clientId, agentId }) => {
    const key = getClientAgentKey(clientId, agentId);
    const { [key]: _sessions, ...sessions } = state.sessions;
    const { [key]: _selected, ...selectedChatIds } = state.selectedChatIds;

    return {
      ...state,
      sessions,
      selectedChatIds,
    };
  }),
);
