import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { distinctUntilChanged, Observable } from 'rxjs';
import { connectSocket, disconnectSocket, forwardEvent, setChatModel, setClient } from './sockets.actions';
import { getSocketInstance } from './sockets.effects';
import {
  selectChatForwarding,
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
  private readonly destroyRef = inject(DestroyRef);
  private currentChatModel: string | null = null;

  // State observables
  readonly connected$: Observable<boolean> = this.store.select(selectSocketConnected);
  readonly connecting$: Observable<boolean> = this.store.select(selectSocketConnecting);
  readonly disconnecting$: Observable<boolean> = this.store.select(selectSocketDisconnecting);
  readonly selectedClientId$: Observable<string | null> = this.store.select(selectSelectedClientId);
  readonly forwarding$: Observable<boolean> = this.store.select(selectSocketForwarding);
  readonly chatForwarding$: Observable<boolean> = this.store.select(selectChatForwarding);
  readonly chatModel$: Observable<string | null> = this.store.select(selectChatModel);
  readonly error$: Observable<string | null> = this.store.select(selectSocketError);
  readonly forwardedEvents$: Observable<Array<{ event: string; payload: ForwardedEventPayload; timestamp: number }>> =
    this.store.select(selectForwardedEvents);

  constructor() {
    this.chatModel$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((model) => {
      this.currentChatModel = model;
    });
  }

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
   * @param agentId - Agent UUID (required for routing the event to the correct agent)
   */
  forwardChat(message: string, agentId: string, model?: string | null): void {
    const effectiveModel = model ?? this.currentChatModel ?? undefined;
    const payload =
      effectiveModel !== undefined && effectiveModel !== null ? { message, model: effectiveModel } : { message };
    this.forwardEvent(ForwardableEvent.CHAT, payload, agentId);
  }

  /**
   * Set the preferred chat model (used as default for subsequent chat messages)
   * @param model - Model identifier or null to clear the preference
   */
  setChatModel(model: string | null): void {
    this.store.dispatch(setChatModel({ model }));
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
   * Forward a file update event
   * @param filePath - The path to the file that was updated
   * @param agentId - Agent UUID (required for routing the event to the correct agent)
   */
  forwardFileUpdate(filePath: string, agentId: string): void {
    this.forwardEvent(ForwardableEvent.FILE_UPDATE, { filePath }, agentId);
  }

  /**
   * Forward a create terminal event
   * @param sessionId - Optional session ID (will be generated if not provided)
   * @param shell - Optional shell command (defaults to 'sh')
   * @param agentId - Agent UUID (required for routing the event to the correct agent)
   */
  forwardCreateTerminal(sessionId: string | undefined, shell: string | undefined, agentId: string): void {
    this.forwardEvent(ForwardableEvent.CREATE_TERMINAL, { sessionId, shell }, agentId);
  }

  /**
   * Forward a terminal input event
   * @param sessionId - The terminal session ID
   * @param data - The input data to send
   * @param agentId - Agent UUID (required for routing the event to the correct agent)
   */
  forwardTerminalInput(sessionId: string, data: string, agentId: string): void {
    this.forwardEvent(ForwardableEvent.TERMINAL_INPUT, { sessionId, data }, agentId);
  }

  /**
   * Forward a close terminal event
   * @param sessionId - The terminal session ID
   * @param agentId - Agent UUID (required for routing the event to the correct agent)
   */
  forwardCloseTerminal(sessionId: string, agentId: string): void {
    this.forwardEvent(ForwardableEvent.CLOSE_TERMINAL, { sessionId }, agentId);
  }

  /**
   * Get forwarded events for a specific event name
   * @param eventName - The event name to filter by
   * @returns Observable of filtered forwarded events
   */
  getForwardedEventsByEvent$(
    eventName: string,
  ): Observable<Array<{ event: string; payload: ForwardedEventPayload; timestamp: number }>> {
    return this.store.select(selectForwardedEventsByEvent(eventName)).pipe(
      // Use distinctUntilChanged with deep comparison to prevent unnecessary emissions
      // when the filtered array content hasn't actually changed
      distinctUntilChanged((prev, curr) => {
        if (prev.length !== curr.length) {
          return false;
        }
        // Compare by timestamp to detect actual changes
        return prev.every((p, i) => p.timestamp === curr[i]?.timestamp);
      }),
    );
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
