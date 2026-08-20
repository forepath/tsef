import type { ChatSessionsState } from './chat-sessions.reducer';
import { initialChatSessionsState } from './chat-sessions.reducer';
import {
  selectChatSessionsError,
  selectChatSessionsForAgent,
  selectIsCreatingChatSession,
  selectIsLoadingChatSessions,
  selectSelectedChatId,
  selectSelectedChatSession,
} from './chat-sessions.selectors';
import type { ChatSessionResponseDto } from './chat-sessions.types';

describe('ChatSessions Selectors', () => {
  const clientId = 'client-1';
  const agentId = 'agent-1';
  const key = `${clientId}:${agentId}`;
  const primarySession: ChatSessionResponseDto = {
    id: 'chat-primary',
    agentId,
    title: 'Primary',
    kind: 'primary',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };
  const userSession: ChatSessionResponseDto = {
    id: 'chat-user',
    agentId,
    title: 'Side chat',
    kind: 'user',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  };
  const state: ChatSessionsState = {
    ...initialChatSessionsState,
    sessions: { [key]: [primarySession, userSession] },
    selectedChatIds: { [key]: userSession.id },
    loading: { [key]: true },
    creating: { [key]: false },
    errors: { [key]: 'boom' },
  };

  it('should select sessions for agent', () => {
    const result = selectChatSessionsForAgent(clientId, agentId).projector(state.sessions);

    expect(result).toEqual([primarySession, userSession]);
  });

  it('should return null when sessions are missing', () => {
    const result = selectChatSessionsForAgent(clientId, agentId).projector({});

    expect(result).toBeNull();
  });

  it('should select selected chat id', () => {
    const result = selectSelectedChatId(clientId, agentId).projector(state.selectedChatIds);

    expect(result).toBe(userSession.id);
  });

  it('should select selected chat session', () => {
    const result = selectSelectedChatSession(clientId, agentId).projector(
      [primarySession, userSession],
      userSession.id,
    );

    expect(result).toEqual(userSession);
  });

  it('should select loading and creating flags', () => {
    expect(selectIsLoadingChatSessions(clientId, agentId).projector(state.loading)).toBe(true);
    expect(selectIsCreatingChatSession(clientId, agentId).projector(state.creating)).toBe(false);
  });

  it('should select error', () => {
    expect(selectChatSessionsError(clientId, agentId).projector(state.errors)).toBe('boom');
  });
});
