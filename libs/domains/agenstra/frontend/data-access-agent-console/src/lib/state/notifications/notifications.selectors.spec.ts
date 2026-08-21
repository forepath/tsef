import { initialNotificationsState } from './notifications.reducer';
import {
  selectActiveEnvironment,
  selectChatSessionHasUnread,
  selectClientAttentionBadge,
  selectClientGitDirty,
  selectClientHasUnread,
  selectClientStatus,
  selectEnvironmentAttentionBadge,
  selectEnvironmentGitDirty,
  selectEnvironmentHasUnread,
  selectEnvironmentStatus,
  selectOtherChatSessionsHaveUnread,
  selectSpacesAttentionBadge,
  selectSpacesHasAttention,
} from './notifications.selectors';

describe('notifications selectors', () => {
  const baseState = {
    notifications: {
      ...initialNotificationsState,
      environmentsByKey: {
        'c1:a1': {
          clientId: 'c1',
          agentId: 'a1',
          hasUnreadMessages: true,
          gitDirty: true,
          gitConflict: false,
          chats: [
            { chatSessionId: 'chat-1', hasUnreadMessages: true },
            { chatSessionId: 'chat-2', hasUnreadMessages: false },
          ],
        },
      },
      clientsById: {
        c1: { clientId: 'c1', hasUnreadMessages: true, gitDirty: true },
      },
      spacesHasAttention: true,
      activeEnvironment: { clientId: 'c1', agentId: 'a1', chatSessionId: 'chat-1' },
    },
  };

  it('selectSpacesHasAttention', () => {
    expect(selectSpacesHasAttention(baseState)).toBe(true);
  });

  it('selectSpacesAttentionBadge', () => {
    expect(selectSpacesAttentionBadge(baseState)).toBe('both');
  });

  it('selectClientAttentionBadge', () => {
    expect(selectClientAttentionBadge('c1')(baseState)).toBe('both');
  });

  it('selectEnvironmentAttentionBadge', () => {
    expect(selectEnvironmentAttentionBadge('c1', 'a1')(baseState)).toBe('both');
  });

  it('selectActiveEnvironment', () => {
    expect(selectActiveEnvironment(baseState)).toEqual({
      clientId: 'c1',
      agentId: 'a1',
      chatSessionId: 'chat-1',
    });
  });

  it('selectChatSessionHasUnread', () => {
    expect(selectChatSessionHasUnread('c1', 'a1', 'chat-1')(baseState)).toBe(true);
    expect(selectChatSessionHasUnread('c1', 'a1', 'chat-2')(baseState)).toBe(false);
  });

  it('selectOtherChatSessionsHaveUnread', () => {
    expect(selectOtherChatSessionsHaveUnread('c1', 'a1', 'chat-2')(baseState)).toBe(true);
    expect(selectOtherChatSessionsHaveUnread('c1', 'a1', 'chat-1')(baseState)).toBe(false);
  });

  it('selectEnvironmentStatus', () => {
    const selector = selectEnvironmentStatus('c1', 'a1');

    expect(selector(baseState)?.hasUnreadMessages).toBe(true);
    expect(selector(baseState)?.gitDirty).toBe(true);
  });

  it('selectClientStatus', () => {
    expect(selectClientStatus('c1')(baseState)?.hasUnreadMessages).toBe(true);
  });

  it('selectClientHasUnread returns false when unknown client', () => {
    expect(selectClientHasUnread('unknown')(baseState)).toBe(false);
  });

  it('selectClientGitDirty', () => {
    expect(selectClientGitDirty('c1')(baseState)).toBe(true);
  });

  it('selectEnvironmentHasUnread', () => {
    expect(selectEnvironmentHasUnread('c1', 'a1')(baseState)).toBe(true);
  });

  it('selectEnvironmentGitDirty', () => {
    expect(selectEnvironmentGitDirty('c1', 'a1')(baseState)).toBe(true);
  });
});
