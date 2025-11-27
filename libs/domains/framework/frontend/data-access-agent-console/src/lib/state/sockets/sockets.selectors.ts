import { createFeatureSelector, createSelector } from '@ngrx/store';
import type { SocketsState } from './sockets.reducer';

export const selectSocketsState = createFeatureSelector<SocketsState>('sockets');

// Connection state selectors
export const selectSocketConnected = createSelector(selectSocketsState, (state) => state.connected);

export const selectSocketConnecting = createSelector(selectSocketsState, (state) => state.connecting);

export const selectSocketDisconnecting = createSelector(selectSocketsState, (state) => state.disconnecting);

// Client context selectors
export const selectSelectedClientId = createSelector(selectSocketsState, (state) => state.selectedClientId);

export const selectChatModel = createSelector(selectSocketsState, (state) => state.chatModel);

// Forwarding state selectors
export const selectSocketForwarding = createSelector(selectSocketsState, (state) => state.forwarding);

// Select forwarding state for chat events only
export const selectChatForwarding = createSelector(
  selectSocketsState,
  (state) => state.forwarding && state.forwardingEvent === 'chat',
);

// Error selector
export const selectSocketError = createSelector(selectSocketsState, (state) => state.error);

// Forwarded events selectors
export const selectForwardedEvents = createSelector(selectSocketsState, (state) => state.forwardedEvents);

/**
 * Select forwarded events for a specific event name
 * Uses a memoized selector factory to ensure proper memoization
 */
export const selectForwardedEventsByEvent = (eventName: string) =>
  createSelector(selectForwardedEvents, (events) => {
    const filtered = events.filter((e) => e.event === eventName);
    // Return a new array reference only if the filtered result actually changed
    // This helps with distinctUntilChanged in observables
    return filtered;
  });

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

/**
 * Select the currently selected agent ID (from loginSuccess)
 */
export const selectSelectedAgentId = createSelector(selectSocketsState, (state) => state.selectedAgentId);
