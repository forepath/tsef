import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

import {
  clearChatSessions,
  createChatSession,
  deleteChatSession,
  hydrateChatSessions,
  loadChatSessions,
  selectChatSession,
  updateChatSession,
} from './chat-sessions.actions';
import {
  selectChatSessionsError,
  selectChatSessionsForAgent,
  selectIsCreatingChatSession,
  selectIsDeletingChatSession,
  selectIsLoadingChatSessions,
  selectIsUpdatingChatSession,
  selectSelectedChatId,
  selectSelectedChatSession,
} from './chat-sessions.selectors';
import type {
  AgentChatSessionSummaryDto,
  ChatSessionResponseDto,
  CreateChatSessionDto,
  ListChatSessionsParams,
  UpdateChatSessionDto,
} from './chat-sessions.types';

/**
 * Facade for chat sessions state management.
 * Sessions are scoped per client + agent (environment).
 */
@Injectable({
  providedIn: 'root',
})
export class ChatSessionsFacade {
  private readonly store = inject(Store);

  getChatSessions$(clientId: string, agentId: string): Observable<ChatSessionResponseDto[] | null> {
    return this.store.select(selectChatSessionsForAgent(clientId, agentId));
  }

  getSelectedChatId$(clientId: string, agentId: string): Observable<string | null> {
    return this.store.select(selectSelectedChatId(clientId, agentId));
  }

  getSelectedChatSession$(clientId: string, agentId: string): Observable<ChatSessionResponseDto | null> {
    return this.store.select(selectSelectedChatSession(clientId, agentId));
  }

  isLoadingChatSessions$(clientId: string, agentId: string): Observable<boolean> {
    return this.store.select(selectIsLoadingChatSessions(clientId, agentId));
  }

  isCreatingChatSession$(clientId: string, agentId: string): Observable<boolean> {
    return this.store.select(selectIsCreatingChatSession(clientId, agentId));
  }

  isUpdatingChatSession$(clientId: string, agentId: string, chatId: string): Observable<boolean> {
    return this.store.select(selectIsUpdatingChatSession(clientId, agentId, chatId));
  }

  isDeletingChatSession$(clientId: string, agentId: string, chatId: string): Observable<boolean> {
    return this.store.select(selectIsDeletingChatSession(clientId, agentId, chatId));
  }

  getChatSessionsError$(clientId: string, agentId: string): Observable<string | null> {
    return this.store.select(selectChatSessionsError(clientId, agentId));
  }

  loadChatSessions(clientId: string, agentId: string, params?: ListChatSessionsParams): void {
    this.store.dispatch(loadChatSessions({ clientId, agentId, params }));
  }

  hydrateChatSessions(
    clientId: string,
    agentId: string,
    chats: AgentChatSessionSummaryDto[],
    primaryChatId: string,
  ): void {
    this.store.dispatch(hydrateChatSessions({ clientId, agentId, chats, primaryChatId }));
  }

  createChatSession(clientId: string, agentId: string, createDto?: CreateChatSessionDto): void {
    this.store.dispatch(createChatSession({ clientId, agentId, createDto }));
  }

  updateChatSession(clientId: string, agentId: string, chatId: string, updateDto: UpdateChatSessionDto): void {
    this.store.dispatch(updateChatSession({ clientId, agentId, chatId, updateDto }));
  }

  deleteChatSession(clientId: string, agentId: string, chatId: string): void {
    this.store.dispatch(deleteChatSession({ clientId, agentId, chatId }));
  }

  /**
   * Select a chat session. When `restore` is true (default), UI/effects should clear timeline and forward restoreChat.
   */
  selectChatSession(clientId: string, agentId: string, chatId: string, restore = true): void {
    this.store.dispatch(selectChatSession({ clientId, agentId, chatId, restore }));
  }

  clearChatSessions(clientId: string, agentId: string): void {
    this.store.dispatch(clearChatSessions({ clientId, agentId }));
  }
}
