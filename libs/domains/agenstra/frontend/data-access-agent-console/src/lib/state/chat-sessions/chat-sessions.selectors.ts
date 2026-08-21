import { createFeatureSelector, createSelector } from '@ngrx/store';

import { getClientAgentKey, type ChatSessionsState } from './chat-sessions.reducer';

export const selectChatSessionsState = createFeatureSelector<ChatSessionsState>('chatSessions');

export const selectChatSessionsMap = createSelector(selectChatSessionsState, (state) => state.sessions);
export const selectSelectedChatIdsMap = createSelector(selectChatSessionsState, (state) => state.selectedChatIds);
export const selectChatSessionsLoadingMap = createSelector(selectChatSessionsState, (state) => state.loading);
export const selectChatSessionsCreatingMap = createSelector(selectChatSessionsState, (state) => state.creating);
export const selectChatSessionsUpdatingMap = createSelector(selectChatSessionsState, (state) => state.updating);
export const selectChatSessionsDeletingMap = createSelector(selectChatSessionsState, (state) => state.deleting);
export const selectChatSessionsErrorsMap = createSelector(selectChatSessionsState, (state) => state.errors);

function getChatKey(clientId: string, agentId: string, chatId: string): string {
  return `${clientId}:${agentId}:${chatId}`;
}

export const selectChatSessionsForAgent = (clientId: string, agentId: string) =>
  createSelector(selectChatSessionsMap, (sessions) => {
    const key = getClientAgentKey(clientId, agentId);

    return sessions[key] ?? null;
  });

export const selectSelectedChatId = (clientId: string, agentId: string) =>
  createSelector(selectSelectedChatIdsMap, (selectedChatIds) => {
    const key = getClientAgentKey(clientId, agentId);

    return selectedChatIds[key] ?? null;
  });

export const selectSelectedChatSession = (clientId: string, agentId: string) =>
  createSelector(
    selectChatSessionsForAgent(clientId, agentId),
    selectSelectedChatId(clientId, agentId),
    (sessions, selectedChatId) => {
      if (!sessions || !selectedChatId) {
        return null;
      }

      return sessions.find((session) => session.id === selectedChatId) ?? null;
    },
  );

export const selectIsLoadingChatSessions = (clientId: string, agentId: string) =>
  createSelector(selectChatSessionsLoadingMap, (loading) => {
    const key = getClientAgentKey(clientId, agentId);

    return loading[key] ?? false;
  });

export const selectIsCreatingChatSession = (clientId: string, agentId: string) =>
  createSelector(selectChatSessionsCreatingMap, (creating) => {
    const key = getClientAgentKey(clientId, agentId);

    return creating[key] ?? false;
  });

export const selectIsUpdatingChatSession = (clientId: string, agentId: string, chatId: string) =>
  createSelector(selectChatSessionsUpdatingMap, (updating) => {
    return updating[getChatKey(clientId, agentId, chatId)] ?? false;
  });

export const selectIsDeletingChatSession = (clientId: string, agentId: string, chatId: string) =>
  createSelector(selectChatSessionsDeletingMap, (deleting) => {
    return deleting[getChatKey(clientId, agentId, chatId)] ?? false;
  });

export const selectChatSessionsError = (clientId: string, agentId: string) =>
  createSelector(selectChatSessionsErrorsMap, (errors) => {
    const key = getClientAgentKey(clientId, agentId);

    return errors[key] ?? null;
  });
