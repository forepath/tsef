import { createReducer, on } from '@ngrx/store';
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
  setChatModel,
  setClient,
  setClientFailure,
  setClientSuccess,
  socketError,
} from './sockets.actions';

export interface SocketsState {
  connected: boolean;
  connecting: boolean;
  disconnecting: boolean;
  selectedClientId: string | null;
  chatModel: string | null;
  forwarding: boolean;
  forwardingEvent: string | null; // Track which event is currently being forwarded
  error: string | null;
  // Track forwarded events received from remote agents namespace
  forwardedEvents: Array<{
    event: string;
    payload: import('./sockets.types').ForwardedEventPayload;
    timestamp: number;
  }>;
}

export const initialSocketsState: SocketsState = {
  connected: false,
  connecting: false,
  disconnecting: false,
  selectedClientId: null,
  chatModel: null,
  forwarding: false,
  forwardingEvent: null,
  error: null,
  forwardedEvents: [],
};

export const socketsReducer = createReducer(
  initialSocketsState,
  // Connect Socket
  on(connectSocket, (state) => ({
    ...state,
    connecting: true,
    error: null,
  })),
  on(connectSocketSuccess, (state) => ({
    ...state,
    connected: true,
    connecting: false,
    error: null,
  })),
  on(connectSocketFailure, (state, { error }) => ({
    ...state,
    connected: false,
    connecting: false,
    error,
  })),
  // Disconnect Socket
  on(disconnectSocket, (state) => ({
    ...state,
    disconnecting: true,
    error: null,
  })),
  on(disconnectSocketSuccess, (state) => ({
    ...state,
    connected: false,
    disconnecting: false,
    selectedClientId: null,
    error: null,
    forwardedEvents: [],
  })),
  // Set Client
  on(setClient, (state) => ({
    ...state,
    error: null,
  })),
  on(setClientSuccess, (state, { clientId }) => ({
    ...state,
    selectedClientId: clientId,
    error: null,
  })),
  on(setClientFailure, (state, { error }) => ({
    ...state,
    error,
  })),
  on(setChatModel, (state, { model }) => ({
    ...state,
    chatModel: model,
  })),
  // Forward Event
  on(forwardEvent, (state, { event }) => ({
    ...state,
    forwarding: true,
    forwardingEvent: event,
    error: null,
  })),
  on(forwardEventSuccess, (state, { event }) => {
    // Only clear forwarding if the success event matches the current forwarding event
    // This prevents clearing forwarding state when a different event succeeds
    if (state.forwardingEvent === event) {
      return {
        ...state,
        forwarding: false,
        forwardingEvent: null,
        error: null,
      };
    }
    return state;
  }),
  on(forwardEventFailure, (state, { error }) => ({
    ...state,
    forwarding: false,
    forwardingEvent: null,
    error,
  })),
  // Socket Error
  on(socketError, (state, { message }) => ({
    ...state,
    error: message,
  })),
  // Forwarded Event Received
  on(forwardedEventReceived, (state, { event, payload }) => ({
    ...state,
    forwardedEvents: [...state.forwardedEvents, { event, payload, timestamp: Date.now() }].slice(-100), // Keep last 100 events to prevent memory issues
  })),
);
