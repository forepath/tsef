import {
  connectSocket,
  connectSocketFailure,
  connectSocketSuccess,
  disconnectSocket,
  disconnectSocketSuccess,
  forwardEvent,
  forwardEventFailure,
  forwardEventSuccess,
  forwardedEventReceived,
  setAgent,
  setChatModel,
  setClient,
  setClientFailure,
  setClientSuccess,
  socketError,
} from './sockets.actions';
import { initialSocketsState, socketsReducer, type SocketsState } from './sockets.reducer';
import { ChatActor, ForwardableEvent, type ForwardedEventPayload } from './sockets.types';

describe('socketsReducer', () => {
  const mockForwardedPayload: ForwardedEventPayload = {
    success: true,
    data: {
      from: ChatActor.USER,
      text: 'Test message',
      timestamp: '2024-01-01T00:00:00Z',
    },
    timestamp: '2024-01-01T00:00:00Z',
  };

  describe('initial state', () => {
    it('should return the initial state', () => {
      const action = { type: 'UNKNOWN' };
      const state = socketsReducer(undefined, action as any);

      expect(state).toEqual(initialSocketsState);
    });
  });

  describe('connectSocket', () => {
    it('should set connecting to true and clear error', () => {
      const state: SocketsState = {
        ...initialSocketsState,
        error: 'Previous error',
      };

      const newState = socketsReducer(state, connectSocket());

      expect(newState.connecting).toBe(true);
      expect(newState.error).toBeNull();
    });
  });

  describe('connectSocketSuccess', () => {
    it('should set connected to true and connecting to false', () => {
      const state: SocketsState = {
        ...initialSocketsState,
        connecting: true,
      };

      const newState = socketsReducer(state, connectSocketSuccess());

      expect(newState.connected).toBe(true);
      expect(newState.connecting).toBe(false);
      expect(newState.error).toBeNull();
    });
  });

  describe('connectSocketFailure', () => {
    it('should set error and set connecting to false', () => {
      const state: SocketsState = {
        ...initialSocketsState,
        connecting: true,
      };

      const newState = socketsReducer(state, connectSocketFailure({ error: 'Connection failed' }));

      expect(newState.error).toBe('Connection failed');
      expect(newState.connected).toBe(false);
      expect(newState.connecting).toBe(false);
    });
  });

  describe('disconnectSocket', () => {
    it('should set disconnecting to true and clear error', () => {
      const state: SocketsState = {
        ...initialSocketsState,
        error: 'Previous error',
      };

      const newState = socketsReducer(state, disconnectSocket());

      expect(newState.disconnecting).toBe(true);
      expect(newState.error).toBeNull();
    });
  });

  describe('disconnectSocketSuccess', () => {
    it('should reset connection state and clear forwarded events', () => {
      const state: SocketsState = {
        ...initialSocketsState,
        connected: true,
        selectedClientId: 'client-1',
        selectedAgentId: 'agent-1',
        forwardedEvents: [{ event: 'chatMessage', payload: mockForwardedPayload, timestamp: Date.now() }],
        disconnecting: true,
      };

      const newState = socketsReducer(state, disconnectSocketSuccess());

      expect(newState.connected).toBe(false);
      expect(newState.disconnecting).toBe(false);
      expect(newState.selectedClientId).toBeNull();
      expect(newState.selectedAgentId).toBeNull();
      expect(newState.forwardedEvents).toEqual([]);
      expect(newState.error).toBeNull();
    });
  });

  describe('setClient', () => {
    it('should clear error and set settingClient flag', () => {
      const state: SocketsState = {
        ...initialSocketsState,
        error: 'Previous error',
      };

      const newState = socketsReducer(state, setClient({ clientId: 'client-1' }));

      expect(newState.error).toBeNull();
      expect(newState.settingClient).toBe(true);
      expect(newState.settingClientId).toBe('client-1');
    });
  });

  describe('setClientSuccess', () => {
    it('should set selectedClientId and clear settingClient flag', () => {
      const state: SocketsState = {
        ...initialSocketsState,
        settingClient: true,
        settingClientId: 'client-1',
      };

      const newState = socketsReducer(state, setClientSuccess({ message: 'Client set', clientId: 'client-1' }));

      expect(newState.selectedClientId).toBe('client-1');
      expect(newState.error).toBeNull();
      expect(newState.settingClient).toBe(false);
      expect(newState.settingClientId).toBeNull();
    });
  });

  describe('setClientFailure', () => {
    it('should set error and clear settingClient flag', () => {
      const state: SocketsState = {
        ...initialSocketsState,
        settingClient: true,
        settingClientId: 'client-1',
      };

      const newState = socketsReducer(state, setClientFailure({ error: 'Set client failed' }));

      expect(newState.error).toBe('Set client failed');
      expect(newState.settingClient).toBe(false);
      expect(newState.settingClientId).toBeNull();
    });
  });

  describe('setChatModel', () => {
    it('should update chatModel value', () => {
      const state: SocketsState = {
        ...initialSocketsState,
        chatModel: null,
      };

      const newState = socketsReducer(state, setChatModel({ model: 'gpt-4o' }));

      expect(newState.chatModel).toBe('gpt-4o');
    });
  });

  describe('forwardEvent', () => {
    it('should set forwarding to true and clear error', () => {
      const state: SocketsState = {
        ...initialSocketsState,
        error: 'Previous error',
      };

      const newState = socketsReducer(
        state,
        forwardEvent({ event: ForwardableEvent.CHAT, payload: { message: 'test' } }),
      );

      expect(newState.forwarding).toBe(true);
      expect(newState.error).toBeNull();
    });
  });

  describe('forwardEventSuccess', () => {
    it('should set forwarding to false', () => {
      const state: SocketsState = {
        ...initialSocketsState,
        forwarding: true,
        forwardingEvent: ForwardableEvent.CHAT,
      };

      const newState = socketsReducer(state, forwardEventSuccess({ received: true, event: ForwardableEvent.CHAT }));

      expect(newState.forwarding).toBe(false);
      expect(newState.error).toBeNull();
    });
  });

  describe('forwardEventFailure', () => {
    it('should set error and set forwarding to false', () => {
      const state: SocketsState = {
        ...initialSocketsState,
        forwarding: true,
      };

      const newState = socketsReducer(state, forwardEventFailure({ error: 'Forward failed' }));

      expect(newState.error).toBe('Forward failed');
      expect(newState.forwarding).toBe(false);
    });
  });

  describe('socketError', () => {
    it('should set error message', () => {
      const state: SocketsState = {
        ...initialSocketsState,
      };

      const newState = socketsReducer(state, socketError({ message: 'Socket error' }));

      expect(newState.error).toBe('Socket error');
    });
  });

  describe('forwardedEventReceived', () => {
    it('should add event to forwardedEvents array', () => {
      const state: SocketsState = {
        ...initialSocketsState,
        forwardedEvents: [],
      };

      const timestamp = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(timestamp);

      const newState = socketsReducer(
        state,
        forwardedEventReceived({ event: 'chatMessage', payload: mockForwardedPayload }),
      );

      expect(newState.forwardedEvents).toEqual([{ event: 'chatMessage', payload: mockForwardedPayload, timestamp }]);

      jest.spyOn(Date, 'now').mockRestore();
    });

    it('should set selectedAgentId from loginSuccess payload', () => {
      const loginSuccessPayload: ForwardedEventPayload = {
        success: true,
        data: {
          message: 'Welcome',
          agentId: 'agent-123',
          agentName: 'Test Agent',
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      const state: SocketsState = {
        ...initialSocketsState,
        selectedAgentId: null,
      };

      const newState = socketsReducer(
        state,
        forwardedEventReceived({ event: 'loginSuccess', payload: loginSuccessPayload }),
      );

      expect(newState.selectedAgentId).toBe('agent-123');
    });

    it('should clear selectedAgentId on logoutSuccess', () => {
      const logoutSuccessPayload: ForwardedEventPayload = {
        success: true,
        data: {
          message: 'Logged out',
          agentId: null,
          agentName: null,
        },
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      const state: SocketsState = {
        ...initialSocketsState,
        selectedAgentId: 'agent-123',
      };

      const newState = socketsReducer(
        state,
        forwardedEventReceived({ event: 'logoutSuccess', payload: logoutSuccessPayload }),
      );

      expect(newState.selectedAgentId).toBeNull();
    });

    it('should not change selectedAgentId for other events', () => {
      const state: SocketsState = {
        ...initialSocketsState,
        selectedAgentId: 'agent-123',
      };

      const newState = socketsReducer(
        state,
        forwardedEventReceived({ event: 'chatMessage', payload: mockForwardedPayload }),
      );

      expect(newState.selectedAgentId).toBe('agent-123');
    });
  });

  describe('setAgent', () => {
    it('should set the selected agent ID', () => {
      const state: SocketsState = {
        ...initialSocketsState,
        selectedAgentId: null,
      };

      const newState = socketsReducer(state, setAgent({ agentId: 'agent-123' }));

      expect(newState.selectedAgentId).toBe('agent-123');
    });

    it('should clear the selected agent ID when set to null', () => {
      const state: SocketsState = {
        ...initialSocketsState,
        selectedAgentId: 'agent-123',
      };

      const newState = socketsReducer(state, setAgent({ agentId: null }));

      expect(newState.selectedAgentId).toBeNull();
    });
  });
});
