import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';

import {
  clearChatSessions,
  createChatSession,
  deleteChatSession,
  hydrateChatSessions,
  loadChatSessions,
  selectChatSession,
  updateChatSession,
} from './chat-sessions.actions';
import { ChatSessionsFacade } from './chat-sessions.facade';
import type { ChatSessionResponseDto } from './chat-sessions.types';

describe('ChatSessionsFacade', () => {
  let facade: ChatSessionsFacade;
  let store: jest.Mocked<Store>;
  const clientId = 'client-1';
  const agentId = 'agent-1';
  const mockSession: ChatSessionResponseDto = {
    id: 'chat-1',
    agentId,
    title: 'Primary',
    kind: 'primary',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    store = {
      select: jest.fn(),
      dispatch: jest.fn(),
    } as unknown as jest.Mocked<Store>;

    TestBed.configureTestingModule({
      providers: [
        ChatSessionsFacade,
        {
          provide: Store,
          useValue: store,
        },
      ],
    });

    facade = TestBed.inject(ChatSessionsFacade);
  });

  it('should select chat sessions', (done) => {
    store.select.mockReturnValue(of([mockSession]));

    facade.getChatSessions$(clientId, agentId).subscribe((result) => {
      expect(result).toEqual([mockSession]);
      done();
    });
  });

  it('should dispatch loadChatSessions', () => {
    facade.loadChatSessions(clientId, agentId);
    expect(store.dispatch).toHaveBeenCalledWith(loadChatSessions({ clientId, agentId, params: undefined }));
  });

  it('should dispatch hydrateChatSessions', () => {
    facade.hydrateChatSessions(clientId, agentId, [{ id: 'chat-1', kind: 'primary', createdAt: 'x' }], 'chat-1');
    expect(store.dispatch).toHaveBeenCalledWith(
      hydrateChatSessions({
        clientId,
        agentId,
        chats: [{ id: 'chat-1', kind: 'primary', createdAt: 'x' }],
        primaryChatId: 'chat-1',
      }),
    );
  });

  it('should dispatch create/update/delete/select/clear', () => {
    facade.createChatSession(clientId, agentId, { title: 'New' });
    expect(store.dispatch).toHaveBeenCalledWith(createChatSession({ clientId, agentId, createDto: { title: 'New' } }));

    facade.updateChatSession(clientId, agentId, 'chat-1', { title: 'Renamed' });
    expect(store.dispatch).toHaveBeenCalledWith(
      updateChatSession({ clientId, agentId, chatId: 'chat-1', updateDto: { title: 'Renamed' } }),
    );

    facade.deleteChatSession(clientId, agentId, 'chat-1');
    expect(store.dispatch).toHaveBeenCalledWith(deleteChatSession({ clientId, agentId, chatId: 'chat-1' }));

    facade.selectChatSession(clientId, agentId, 'chat-1');
    expect(store.dispatch).toHaveBeenCalledWith(
      selectChatSession({ clientId, agentId, chatId: 'chat-1', restore: true }),
    );

    facade.clearChatSessions(clientId, agentId);
    expect(store.dispatch).toHaveBeenCalledWith(clearChatSessions({ clientId, agentId }));
  });
});
