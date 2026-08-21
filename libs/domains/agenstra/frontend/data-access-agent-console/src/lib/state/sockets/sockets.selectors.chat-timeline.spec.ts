import { CLIENT_CHAT_AUTOMATION_SOCKET_EVENT } from './client-chat-automation.constants';
import { selectChatTimelineOrdered } from './sockets.selectors';
import type { ForwardedEventPayload } from './sockets.types';

const primarySession = {
  id: 'chat-primary',
  agentId: 'a1',
  title: 'Chat',
  kind: 'primary' as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const userSession = {
  id: 'chat-user',
  agentId: 'a1',
  title: 'Side',
  kind: 'user' as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const sessionsMap = {
  'c1:a1': [primarySession, userSession],
};

describe('selectChatTimelineOrdered', () => {
  it('orders chat and automation by semantic timestamp and dedupes automation by run id', () => {
    const chatPayload: ForwardedEventPayload = {
      success: true,
      data: { from: 'user', text: 'hi', timestamp: new Date(1000).toISOString() },
      timestamp: new Date(1000).toISOString(),
    } as ForwardedEventPayload;
    const autoPayload = {
      timelineAt: new Date(500).toISOString(),
      hydrate: false,
      ticket: {
        id: 't1',
        clientId: 'c1',
        title: 'T',
        priority: 'medium',
        status: 'todo',
        automationEligible: true,
        preferredChatAgentId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      run: {
        id: 'r1',
        ticketId: 't1',
        clientId: 'c1',
        agentId: 'a1',
        status: 'running',
        phase: 'iterate',
        startedAt: new Date(500).toISOString(),
        updatedAt: new Date(500).toISOString(),
        finishedAt: null,
      },
      actions: [],
    };
    const autoPayload2 = {
      ...autoPayload,
      timelineAt: new Date(800).toISOString(),
      run: { ...autoPayload.run, status: 'succeeded', updatedAt: new Date(800).toISOString() },
    };
    const state = {
      forwardedEvents: [
        { event: 'chatMessage', payload: chatPayload, timestamp: 999 },
        { event: CLIENT_CHAT_AUTOMATION_SOCKET_EVENT, payload: autoPayload, timestamp: 501 },
        { event: CLIENT_CHAT_AUTOMATION_SOCKET_EVENT, payload: autoPayload2, timestamp: 802 },
      ],
      selectedAgentId: 'a1',
    } as never;
    const out = selectChatTimelineOrdered.projector(
      state.forwardedEvents as never,
      state.selectedAgentId,
      'c1',
      { 'c1:a1': null },
      sessionsMap,
    );

    expect(out.map((r) => r.event)).toEqual([CLIENT_CHAT_AUTOMATION_SOCKET_EVENT, 'chatMessage']);
    expect((out[0]?.payload as typeof autoPayload2).run.status).toBe('succeeded');
  });

  it('filters automation when selected agent does not match', () => {
    const autoPayload = {
      timelineAt: new Date(500).toISOString(),
      hydrate: false,
      ticket: {
        id: 't1',
        clientId: 'c1',
        title: 'T',
        priority: 'medium',
        status: 'todo',
        automationEligible: true,
        preferredChatAgentId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      run: {
        id: 'r1',
        ticketId: 't1',
        clientId: 'c1',
        agentId: 'other',
        status: 'running',
        phase: 'iterate',
        startedAt: new Date(500).toISOString(),
        updatedAt: new Date(500).toISOString(),
        finishedAt: null,
      },
      actions: [],
    };
    const out = selectChatTimelineOrdered.projector(
      [
        { event: CLIENT_CHAT_AUTOMATION_SOCKET_EVENT, payload: autoPayload, timestamp: 1, semanticTimestamp: 1 },
      ] as never,
      'a1',
      'c1',
      {},
      sessionsMap,
    );

    expect(out).toHaveLength(0);
  });

  it('shows automation cards on the primary chat session only', () => {
    const autoPayload = {
      timelineAt: new Date(500).toISOString(),
      hydrate: false,
      ticket: {
        id: 't1',
        clientId: 'c1',
        title: 'T',
        priority: 'medium',
        status: 'todo',
        automationEligible: true,
        preferredChatAgentId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      run: {
        id: 'r1',
        ticketId: 't1',
        clientId: 'c1',
        agentId: 'a1',
        status: 'running',
        phase: 'iterate',
        startedAt: new Date(500).toISOString(),
        updatedAt: new Date(500).toISOString(),
        finishedAt: null,
      },
      actions: [],
    };
    const events = [{ event: CLIENT_CHAT_AUTOMATION_SOCKET_EVENT, payload: autoPayload, timestamp: 1 }] as never;

    const onPrimary = selectChatTimelineOrdered.projector(
      events,
      'a1',
      'c1',
      { 'c1:a1': primarySession.id },
      sessionsMap,
    );
    const onUser = selectChatTimelineOrdered.projector(events, 'a1', 'c1', { 'c1:a1': userSession.id }, sessionsMap);

    expect(onPrimary).toHaveLength(1);
    expect(onUser).toHaveLength(0);
  });

  it('filters chat messages by selected chatId when present', () => {
    const matching: ForwardedEventPayload = {
      success: true,
      data: { from: 'user', text: 'keep', timestamp: new Date(1000).toISOString(), chatId: 'chat-a' },
      timestamp: new Date(1000).toISOString(),
    } as ForwardedEventPayload;
    const other: ForwardedEventPayload = {
      success: true,
      data: { from: 'user', text: 'drop', timestamp: new Date(2000).toISOString(), chatId: 'chat-b' },
      timestamp: new Date(2000).toISOString(),
    } as ForwardedEventPayload;
    const out = selectChatTimelineOrdered.projector(
      [
        { event: 'chatMessage', payload: matching, timestamp: 1, chatId: 'chat-a' },
        { event: 'chatMessage', payload: other, timestamp: 2, chatId: 'chat-b' },
      ] as never,
      'a1',
      'c1',
      { 'c1:a1': 'chat-a' },
      sessionsMap,
    );

    expect(out).toHaveLength(1);
    expect((out[0]?.payload as typeof matching).data).toMatchObject({ text: 'keep' });
  });

  it('hides chat messages without chatId when a session is selected', () => {
    const legacy: ForwardedEventPayload = {
      success: true,
      data: { from: 'user', text: 'legacy', timestamp: new Date(1000).toISOString() },
      timestamp: new Date(1000).toISOString(),
    } as ForwardedEventPayload;
    const out = selectChatTimelineOrdered.projector(
      [{ event: 'chatMessage', payload: legacy, timestamp: 1 }] as never,
      'a1',
      'c1',
      { 'c1:a1': 'chat-a' },
      sessionsMap,
    );

    expect(out).toHaveLength(0);
  });
});
