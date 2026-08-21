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
import { chatSessionsReducer, initialChatSessionsState, type ChatSessionsState } from './chat-sessions.reducer';
import type { ChatSessionResponseDto } from './chat-sessions.types';

describe('chatSessionsReducer', () => {
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

  it('should return the initial state', () => {
    const state = chatSessionsReducer(undefined, { type: 'UNKNOWN' } as never);

    expect(state).toEqual(initialChatSessionsState);
  });

  it('should set loading on loadChatSessions', () => {
    const state = chatSessionsReducer(initialChatSessionsState, loadChatSessions({ clientId, agentId }));

    expect(state.loading[key]).toBe(true);
    expect(state.errors[key]).toBeNull();
  });

  it('should store sessions and select primary on load success', () => {
    const state = chatSessionsReducer(
      { ...initialChatSessionsState, loading: { [key]: true } },
      loadChatSessionsSuccess({
        clientId,
        agentId,
        sessions: [primarySession, userSession],
        primaryChatId: primarySession.id,
      }),
    );

    expect(state.sessions[key]).toEqual([primarySession, userSession]);
    expect(state.selectedChatIds[key]).toBe(primarySession.id);
    expect(state.loading[key]).toBe(false);
  });

  it('should set error on load failure', () => {
    const state = chatSessionsReducer(
      { ...initialChatSessionsState, loading: { [key]: true } },
      loadChatSessionsFailure({ clientId, agentId, error: 'Load failed' }),
    );

    expect(state.loading[key]).toBe(false);
    expect(state.errors[key]).toBe('Load failed');
  });

  it('should hydrate from agent chat summaries', () => {
    const state = chatSessionsReducer(
      initialChatSessionsState,
      hydrateChatSessions({
        clientId,
        agentId,
        chats: [
          { id: primarySession.id, kind: 'primary', createdAt: primarySession.createdAt, title: 'Primary' },
          { id: userSession.id, kind: 'user', createdAt: userSession.createdAt, title: 'Side chat' },
        ],
        primaryChatId: primarySession.id,
      }),
    );

    expect(state.sessions[key]?.map((s) => s.id)).toEqual([primarySession.id, userSession.id]);
    expect(state.selectedChatIds[key]).toBe(primarySession.id);
  });

  it('should append and select session on create success', () => {
    const prev: ChatSessionsState = {
      ...initialChatSessionsState,
      sessions: { [key]: [primarySession] },
      selectedChatIds: { [key]: primarySession.id },
      creating: { [key]: true },
    };
    const state = chatSessionsReducer(prev, createChatSessionSuccess({ clientId, agentId, session: userSession }));

    expect(state.sessions[key]).toEqual([primarySession, userSession]);
    expect(state.selectedChatIds[key]).toBe(userSession.id);
    expect(state.creating[key]).toBe(false);
  });

  it('should update session title', () => {
    const prev: ChatSessionsState = {
      ...initialChatSessionsState,
      sessions: { [key]: [primarySession, userSession] },
    };
    const updated = { ...userSession, title: 'Renamed' };
    const state = chatSessionsReducer(prev, updateChatSessionSuccess({ clientId, agentId, session: updated }));

    expect(state.sessions[key]?.find((s) => s.id === userSession.id)?.title).toBe('Renamed');
  });

  it('should remove session and fall back to primary on delete', () => {
    const prev: ChatSessionsState = {
      ...initialChatSessionsState,
      sessions: { [key]: [primarySession, userSession] },
      selectedChatIds: { [key]: userSession.id },
    };
    const state = chatSessionsReducer(prev, deleteChatSessionSuccess({ clientId, agentId, chatId: userSession.id }));

    expect(state.sessions[key]).toEqual([primarySession]);
    expect(state.selectedChatIds[key]).toBe(primarySession.id);
  });

  it('should select a chat session', () => {
    const prev: ChatSessionsState = {
      ...initialChatSessionsState,
      sessions: { [key]: [primarySession, userSession] },
      selectedChatIds: { [key]: primarySession.id },
    };
    const state = chatSessionsReducer(prev, selectChatSession({ clientId, agentId, chatId: userSession.id }));

    expect(state.selectedChatIds[key]).toBe(userSession.id);
  });

  it('should clear sessions for a client/agent', () => {
    const prev: ChatSessionsState = {
      ...initialChatSessionsState,
      sessions: { [key]: [primarySession] },
      selectedChatIds: { [key]: primarySession.id },
    };
    const state = chatSessionsReducer(prev, clearChatSessions({ clientId, agentId }));

    expect(state.sessions[key]).toBeUndefined();
    expect(state.selectedChatIds[key]).toBeUndefined();
  });

  it('should track creating/updating/deleting flags', () => {
    let state = chatSessionsReducer(initialChatSessionsState, createChatSession({ clientId, agentId }));

    expect(state.creating[key]).toBe(true);

    state = chatSessionsReducer(state, createChatSessionFailure({ clientId, agentId, error: 'x' }));
    expect(state.creating[key]).toBe(false);

    state = chatSessionsReducer(
      state,
      updateChatSession({ clientId, agentId, chatId: userSession.id, updateDto: { title: 't' } }),
    );
    expect(state.updating[`${key}:${userSession.id}`]).toBe(true);

    state = chatSessionsReducer(
      state,
      updateChatSessionFailure({ clientId, agentId, chatId: userSession.id, error: 'y' }),
    );
    expect(state.updating[`${key}:${userSession.id}`]).toBe(false);

    state = chatSessionsReducer(state, deleteChatSession({ clientId, agentId, chatId: userSession.id }));
    expect(state.deleting[`${key}:${userSession.id}`]).toBe(true);

    state = chatSessionsReducer(
      state,
      deleteChatSessionFailure({ clientId, agentId, chatId: userSession.id, error: 'z' }),
    );
    expect(state.deleting[`${key}:${userSession.id}`]).toBe(false);
  });
});
