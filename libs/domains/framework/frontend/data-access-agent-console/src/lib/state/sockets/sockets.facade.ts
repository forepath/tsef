import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { connectSocket, disconnectSocket, forwardEvent, setClient } from './sockets.actions';
import { getSocketInstance } from './sockets.effects';
import {
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
} from './sockets.selectors';
import { ForwardableEvent, type ForwardableEventPayload, type ForwardedEventPayload } from './sockets.types';

/**
 * Facade for sockets state management.
 * Provides a clean API for components to interact with socket state
 * without directly accessing the NgRx store or socket instance.
 */
@Injectable({
  providedIn: 'root',
})
export class SocketsFacade {
  private readonly store = inject(Store);

  // State observables
  readonly connected$: Observable<boolean> = this.store.select(selectSocketConnected);
  readonly connecting$: Observable<boolean> = this.store.select(selectSocketConnecting);
  readonly disconnecting$: Observable<boolean> = this.store.select(selectSocketDisconnecting);
  readonly selectedClientId$: Observable<string | null> = this.store.select(selectSelectedClientId);
  readonly forwarding$: Observable<boolean> = this.store.select(selectSocketForwarding);
  readonly error$: Observable<string | null> = this.store.select(selectSocketError);
  readonly forwardedEvents$: Observable<Array<{ event: string; payload: ForwardedEventPayload; timestamp: number }>> =
    this.store.select(selectForwardedEvents);

  /**
   * Connect to the socket
   */
  connect(): void {
    this.store.dispatch(connectSocket());
  }

  /**
   * Disconnect from the socket
   */
  disconnect(): void {
    this.store.dispatch(disconnectSocket());
  }

  /**
   * Set the client context for subsequent operations
   * @param clientId - The client UUID
   */
  setClient(clientId: string): void {
    const socket = getSocketInstance();
    if (!socket || !socket.connected) {
      console.warn('Socket not connected. Cannot set client.');
      return;
    }
    this.store.dispatch(setClient({ clientId }));
    socket.emit('setClient', { clientId });
  }

  /**
   * Forward an event to the agents namespace
   * @param event - The event type (from ForwardableEvent enum)
   * @param payload - Optional event payload (typed based on event)
   * @param agentId - Optional agent UUID for auto-login
   */
  forwardEvent(event: ForwardableEvent, payload?: ForwardableEventPayload, agentId?: string): void {
    const socket = getSocketInstance();
    if (!socket || !socket.connected) {
      console.warn('Socket not connected. Cannot forward event.');
      return;
    }
    this.store.dispatch(forwardEvent({ event, payload, agentId }));
    socket.emit('forward', { event, payload, agentId });
  }

  /**
   * Forward a chat event with typed payload
   * @param message - The chat message text
   * @param agentId - Optional agent UUID for auto-login
   */
  forwardChat(message: string, agentId?: string): void {
    this.forwardEvent(ForwardableEvent.CHAT, { message }, agentId);
  }

  /**
   * Forward a login event
   * Note: When agentId is provided, the payload is automatically overridden with credentials from database
   * @param agentId - Agent UUID for auto-login (credentials loaded from database)
   */
  forwardLogin(agentId: string): void {
    // Payload is optional and ignored when agentId is provided (credentials loaded from DB)
    this.forwardEvent(ForwardableEvent.LOGIN, undefined, agentId);
  }

  /**
   * Forward a logout event
   */
  forwardLogout(): void {
    this.forwardEvent(ForwardableEvent.LOGOUT, {});
  }

  /**
   * Get forwarded events for a specific event name
   * @param eventName - The event name to filter by
   * @returns Observable of filtered forwarded events
   */
  getForwardedEventsByEvent$(
    eventName: string,
  ): Observable<Array<{ event: string; payload: ForwardedEventPayload; timestamp: number }>> {
    return this.store.select(selectForwardedEventsByEvent(eventName));
  }

  /**
   * Get the most recent forwarded event
   * @returns Observable of the most recent event or null
   */
  getMostRecentForwardedEvent$(): Observable<{
    event: string;
    payload: ForwardedEventPayload;
    timestamp: number;
  } | null> {
    return this.store.select(selectMostRecentForwardedEvent);
  }

  /**
   * Get the most recent forwarded event for a specific event name
   * @param eventName - The event name to filter by
   * @returns Observable of the most recent event or null
   */
  getMostRecentForwardedEventByEvent$(
    eventName: string,
  ): Observable<{ event: string; payload: ForwardedEventPayload; timestamp: number } | null> {
    return this.store.select(selectMostRecentForwardedEventByEvent(eventName));
  }
}
