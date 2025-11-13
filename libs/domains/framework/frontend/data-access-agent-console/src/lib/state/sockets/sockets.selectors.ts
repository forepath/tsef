import { createFeatureSelector, createSelector } from '@ngrx/store';
import type { SocketsState } from './sockets.reducer';

export const selectSocketsState = createFeatureSelector<SocketsState>('sockets');

// Connection state selectors
export const selectSocketConnected = createSelector(selectSocketsState, (state) => state.connected);

export const selectSocketConnecting = createSelector(selectSocketsState, (state) => state.connecting);

export const selectSocketDisconnecting = createSelector(selectSocketsState, (state) => state.disconnecting);

// Client context selectors
export const selectSelectedClientId = createSelector(selectSocketsState, (state) => state.selectedClientId);

// Forwarding state selectors
export const selectSocketForwarding = createSelector(selectSocketsState, (state) => state.forwarding);

// Error selector
export const selectSocketError = createSelector(selectSocketsState, (state) => state.error);

// Forwarded events selectors
export const selectForwardedEvents = createSelector(selectSocketsState, (state) => state.forwardedEvents);

/**
 * Select forwarded events for a specific event name
 */
export const selectForwardedEventsByEvent = (eventName: string) =>
  createSelector(selectForwardedEvents, (events) => events.filter((e) => e.event === eventName));

/**
 * Select the most recent forwarded event
 */
export const selectMostRecentForwardedEvent = createSelector(selectForwardedEvents, (events) =>
  events.length > 0 ? events[events.length - 1] : null,
);

/**
 * Select the most recent forwarded event for a specific event name
 */
export const selectMostRecentForwardedEventByEvent = (eventName: string) =>
  createSelector(selectForwardedEvents, (events) => {
    const filtered = events.filter((e) => e.event === eventName);
    return filtered.length > 0 ? filtered[filtered.length - 1] : null;
  });
