import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { provideMockActions } from '@ngrx/effects/testing';
import { of, throwError } from 'rxjs';

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
import { createChatSession$, deleteChatSession$, loadChatSessions$, updateChatSession$ } from './chat-sessions.effects';
import type { ChatSessionResponseDto, CreateChatSessionDto, UpdateChatSessionDto } from './chat-sessions.types';

describe('ChatSessionsEffects', () => {
  let actions$: Actions;
  let chatSessionsService: jest.Mocked<ChatSessionsService>;
  const clientId = 'client-1';
  const agentId = 'agent-1';
  const chatId = 'chat-1';
  const mockSession: ChatSessionResponseDto = {
    id: chatId,
    agentId,
    title: 'Primary',
    kind: 'primary',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    chatSessionsService = {
      listChatSessions: jest.fn(),
      createChatSession: jest.fn(),
      updateChatSession: jest.fn(),
      deleteChatSession: jest.fn(),
    } as unknown as jest.Mocked<ChatSessionsService>;

    TestBed.configureTestingModule({
      providers: [
        provideMockActions(() => actions$),
        {
          provide: ChatSessionsService,
          useValue: chatSessionsService,
        },
      ],
    });

    actions$ = TestBed.inject(Actions);
  });

  describe('loadChatSessions$', () => {
    it('should return loadChatSessionsSuccess on success', (done) => {
      const action = loadChatSessions({ clientId, agentId });
      const outcome = loadChatSessionsSuccess({
        clientId,
        agentId,
        sessions: [mockSession],
        primaryChatId: mockSession.id,
      });

      actions$ = of(action);
      chatSessionsService.listChatSessions.mockReturnValue(of([mockSession]));

      loadChatSessions$(actions$, chatSessionsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should return loadChatSessionsFailure on error', (done) => {
      const action = loadChatSessions({ clientId, agentId });
      const error = new Error('Load failed');

      actions$ = of(action);
      chatSessionsService.listChatSessions.mockReturnValue(throwError(() => error));

      loadChatSessions$(actions$, chatSessionsService).subscribe((result) => {
        expect(result).toEqual(loadChatSessionsFailure({ clientId, agentId, error: 'Load failed' }));
        done();
      });
    });
  });

  describe('createChatSession$', () => {
    it('should return createChatSessionSuccess on success', (done) => {
      const createDto: CreateChatSessionDto = { title: 'New' };
      const created = { ...mockSession, id: 'chat-2', kind: 'user' as const, title: 'New' };
      const action = createChatSession({ clientId, agentId, createDto });

      actions$ = of(action);
      chatSessionsService.createChatSession.mockReturnValue(of(created));

      createChatSession$(actions$, chatSessionsService).subscribe((result) => {
        expect(result).toEqual(createChatSessionSuccess({ clientId, agentId, session: created }));
        done();
      });
    });

    it('should return createChatSessionFailure on error', (done) => {
      const action = createChatSession({ clientId, agentId });

      actions$ = of(action);
      chatSessionsService.createChatSession.mockReturnValue(throwError(() => new Error('Create failed')));

      createChatSession$(actions$, chatSessionsService).subscribe((result) => {
        expect(result).toEqual(createChatSessionFailure({ clientId, agentId, error: 'Create failed' }));
        done();
      });
    });
  });

  describe('updateChatSession$', () => {
    it('should return updateChatSessionSuccess on success', (done) => {
      const updateDto: UpdateChatSessionDto = { title: 'Renamed' };
      const updated = { ...mockSession, title: 'Renamed' };
      const action = updateChatSession({ clientId, agentId, chatId, updateDto });

      actions$ = of(action);
      chatSessionsService.updateChatSession.mockReturnValue(of(updated));

      updateChatSession$(actions$, chatSessionsService).subscribe((result) => {
        expect(result).toEqual(updateChatSessionSuccess({ clientId, agentId, session: updated }));
        done();
      });
    });

    it('should return updateChatSessionFailure on error', (done) => {
      const action = updateChatSession({
        clientId,
        agentId,
        chatId,
        updateDto: { title: 'x' },
      });

      actions$ = of(action);
      chatSessionsService.updateChatSession.mockReturnValue(throwError(() => new Error('Update failed')));

      updateChatSession$(actions$, chatSessionsService).subscribe((result) => {
        expect(result).toEqual(updateChatSessionFailure({ clientId, agentId, chatId, error: 'Update failed' }));
        done();
      });
    });
  });

  describe('deleteChatSession$', () => {
    it('should return deleteChatSessionSuccess on success', (done) => {
      const action = deleteChatSession({ clientId, agentId, chatId });

      actions$ = of(action);
      chatSessionsService.deleteChatSession.mockReturnValue(of(undefined));

      deleteChatSession$(actions$, chatSessionsService).subscribe((result) => {
        expect(result).toEqual(deleteChatSessionSuccess({ clientId, agentId, chatId }));
        done();
      });
    });

    it('should return deleteChatSessionFailure on error', (done) => {
      const action = deleteChatSession({ clientId, agentId, chatId });

      actions$ = of(action);
      chatSessionsService.deleteChatSession.mockReturnValue(throwError(() => new Error('Delete failed')));

      deleteChatSession$(actions$, chatSessionsService).subscribe((result) => {
        expect(result).toEqual(deleteChatSessionFailure({ clientId, agentId, chatId, error: 'Delete failed' }));
        done();
      });
    });
  });
});
