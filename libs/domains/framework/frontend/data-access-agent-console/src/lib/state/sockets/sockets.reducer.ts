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
  forwarding: boolean;
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
  forwarding: false,
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
  // Forward Event
  on(forwardEvent, (state) => ({
    ...state,
    forwarding: true,
    error: null,
  })),
  on(forwardEventSuccess, (state) => ({
    ...state,
    forwarding: false,
    error: null,
  })),
  on(forwardEventFailure, (state, { error }) => ({
    ...state,
    forwarding: false,
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
