import { createFeatureSelector } from '@ngrx/store';
import {
  selectChatModel,
  selectForwardedEvents,
  selectForwardedEventsByEvent,
  selectMostRecentForwardedEvent,
  selectMostRecentForwardedEventByEvent,
  selectSelectedClientId,
  selectSocketConnected,
  selectSocketConnecting,
  selectSocketDisconnecting,
  selectSocketError,
  selectSocketForwarding,
  selectSocketsState,
} from './sockets.selectors';
import { initialSocketsState, type SocketsState } from './sockets.reducer';
import { ChatActor, type ForwardedEventPayload } from './sockets.types';

describe('Sockets Selectors', () => {
  const mockForwardedPayload: ForwardedEventPayload = {
    success: true,
    data: {
      from: ChatActor.USER,
      text: 'Test message',
      timestamp: '2024-01-01T00:00:00Z',
    },
    timestamp: '2024-01-01T00:00:00Z',
  };

  const mockForwardedPayload2: ForwardedEventPayload = {
    success: true,
    data: {
      from: ChatActor.AGENT,
      response: { type: 'response' },
      timestamp: '2024-01-01T01:00:00Z',
    },
    timestamp: '2024-01-01T01:00:00Z',
  };

  const createState = (overrides?: Partial<SocketsState>): SocketsState => ({
    ...initialSocketsState,
    ...overrides,
  });

  describe('selectSocketsState', () => {
    it('should select the sockets feature state', () => {
      const state = createState();
      const rootState = { sockets: state };
      const result = selectSocketsState(rootState as any);

      expect(result).toEqual(state);
    });
  });

  describe('selectSocketConnected', () => {
    it('should select connected state', () => {
      const state = createState({ connected: true });
      const rootState = { sockets: state };
      const result = selectSocketConnected(rootState as any);

      expect(result).toBe(true);
    });

    it('should return false when not connected', () => {
      const state = createState({ connected: false });
      const rootState = { sockets: state };
      const result = selectSocketConnected(rootState as any);

      expect(result).toBe(false);
    });
  });

  describe('selectSocketConnecting', () => {
    it('should select connecting state', () => {
      const state = createState({ connecting: true });
      const rootState = { sockets: state };
      const result = selectSocketConnecting(rootState as any);

      expect(result).toBe(true);
    });
  });

  describe('selectSocketDisconnecting', () => {
    it('should select disconnecting state', () => {
      const state = createState({ disconnecting: true });
      const rootState = { sockets: state };
      const result = selectSocketDisconnecting(rootState as any);

      expect(result).toBe(true);
    });
  });

  describe('selectSelectedClientId', () => {
    it('should select selectedClientId', () => {
      const state = createState({ selectedClientId: 'client-1' });
      const rootState = { sockets: state };
      const result = selectSelectedClientId(rootState as any);

      expect(result).toBe('client-1');
    });

    it('should return null when no client is selected', () => {
      const state = createState({ selectedClientId: null });
      const rootState = { sockets: state };
      const result = selectSelectedClientId(rootState as any);

      expect(result).toBeNull();
    });
  });

  describe('selectChatModel', () => {
    it('should select chatModel value', () => {
      const state = createState({ chatModel: 'gpt-4o' });
      const rootState = { sockets: state };
      const result = selectChatModel(rootState as any);

      expect(result).toBe('gpt-4o');
    });

    it('should return null when chatModel is not set', () => {
      const state = createState({ chatModel: null });
      const rootState = { sockets: state };
      const result = selectChatModel(rootState as any);

      expect(result).toBeNull();
    });
  });

  describe('selectSocketForwarding', () => {
    it('should select forwarding state', () => {
      const state = createState({ forwarding: true });
      const rootState = { sockets: state };
      const result = selectSocketForwarding(rootState as any);

      expect(result).toBe(true);
    });
  });

  describe('selectSocketError', () => {
    it('should select error', () => {
      const state = createState({ error: 'Test error' });
      const rootState = { sockets: state };
      const result = selectSocketError(rootState as any);

      expect(result).toBe('Test error');
    });

    it('should return null when no error', () => {
      const state = createState({ error: null });
      const rootState = { sockets: state };
      const result = selectSocketError(rootState as any);

      expect(result).toBeNull();
    });
  });

  describe('selectForwardedEvents', () => {
    it('should select forwardedEvents', () => {
      const events = [
        { event: 'chatMessage', payload: mockForwardedPayload, timestamp: 1000 },
        { event: 'chatMessage', payload: mockForwardedPayload2, timestamp: 2000 },
      ];
      const state = createState({ forwardedEvents: events });
      const rootState = { sockets: state };
      const result = selectForwardedEvents(rootState as any);

      expect(result).toEqual(events);
    });

    it('should return empty array when no events', () => {
      const state = createState({ forwardedEvents: [] });
      const rootState = { sockets: state };
      const result = selectForwardedEvents(rootState as any);

      expect(result).toEqual([]);
    });
  });

  describe('selectForwardedEventsByEvent', () => {
    it('should filter events by event name', () => {
      const events = [
        { event: 'chatMessage', payload: mockForwardedPayload, timestamp: 1000 },
        { event: 'loginSuccess', payload: mockForwardedPayload, timestamp: 2000 },
        { event: 'chatMessage', payload: mockForwardedPayload2, timestamp: 3000 },
      ];
      const state = createState({ forwardedEvents: events });
      const rootState = { sockets: state };
      const selector = selectForwardedEventsByEvent('chatMessage');
      const result = selector(rootState as any);

      expect(result).toEqual([
        { event: 'chatMessage', payload: mockForwardedPayload, timestamp: 1000 },
        { event: 'chatMessage', payload: mockForwardedPayload2, timestamp: 3000 },
      ]);
    });

    it('should return empty array when no matching events', () => {
      const events = [{ event: 'chatMessage', payload: mockForwardedPayload, timestamp: 1000 }];
      const state = createState({ forwardedEvents: events });
      const rootState = { sockets: state };
      const selector = selectForwardedEventsByEvent('loginSuccess');
      const result = selector(rootState as any);

      expect(result).toEqual([]);
    });
  });

  describe('selectMostRecentForwardedEvent', () => {
    it('should return the most recent event', () => {
      const events = [
        { event: 'chatMessage', payload: mockForwardedPayload, timestamp: 1000 },
        { event: 'loginSuccess', payload: mockForwardedPayload, timestamp: 2000 },
        { event: 'chatMessage', payload: mockForwardedPayload2, timestamp: 3000 },
      ];
      const state = createState({ forwardedEvents: events });
      const rootState = { sockets: state };
      const result = selectMostRecentForwardedEvent(rootState as any);

      expect(result).toEqual({ event: 'chatMessage', payload: mockForwardedPayload2, timestamp: 3000 });
    });

    it('should return null when no events', () => {
      const state = createState({ forwardedEvents: [] });
      const rootState = { sockets: state };
      const result = selectMostRecentForwardedEvent(rootState as any);

      expect(result).toBeNull();
    });
  });

  describe('selectMostRecentForwardedEventByEvent', () => {
    it('should return the most recent event for a specific event name', () => {
      const events = [
        { event: 'chatMessage', payload: mockForwardedPayload, timestamp: 1000 },
        { event: 'loginSuccess', payload: mockForwardedPayload, timestamp: 2000 },
        { event: 'chatMessage', payload: mockForwardedPayload2, timestamp: 3000 },
      ];
      const state = createState({ forwardedEvents: events });
      const rootState = { sockets: state };
      const selector = selectMostRecentForwardedEventByEvent('chatMessage');
      const result = selector(rootState as any);

      expect(result).toEqual({ event: 'chatMessage', payload: mockForwardedPayload2, timestamp: 3000 });
    });

    it('should return null when no matching events', () => {
      const events = [{ event: 'chatMessage', payload: mockForwardedPayload, timestamp: 1000 }];
      const state = createState({ forwardedEvents: events });
      const rootState = { sockets: state };
      const selector = selectMostRecentForwardedEventByEvent('loginSuccess');
      const result = selector(rootState as any);

      expect(result).toBeNull();
    });
  });
});
