import { createAction, props } from '@ngrx/store';

// Connect Actions
export const connectSocket = createAction('[Sockets] Connect Socket');

export const connectSocketSuccess = createAction('[Sockets] Connect Socket Success');

export const connectSocketFailure = createAction('[Sockets] Connect Socket Failure', props<{ error: string }>());

// Disconnect Actions
export const disconnectSocket = createAction('[Sockets] Disconnect Socket');

export const disconnectSocketSuccess = createAction('[Sockets] Disconnect Socket Success');

// Set Client Actions
export const setClient = createAction('[Sockets] Set Client', props<{ clientId: string }>());

export const setClientSuccess = createAction(
  '[Sockets] Set Client Success',
  props<{ message: string; clientId: string }>(),
);

export const setClientFailure = createAction('[Sockets] Set Client Failure', props<{ error: string }>());

export const setChatModel = createAction('[Sockets] Set Chat Model', props<{ model: string | null }>());

// Forward Actions
export const forwardEvent = createAction(
  '[Sockets] Forward Event',
  props<{
    event: import('./sockets.types').ForwardableEvent;
    payload?: import('./sockets.types').ForwardableEventPayload;
    agentId?: string;
  }>(),
);

export const forwardEventSuccess = createAction(
  '[Sockets] Forward Event Success',
  props<{ received: boolean; event: string }>(),
);

export const forwardEventFailure = createAction('[Sockets] Forward Event Failure', props<{ error: string }>());

// Error Actions
export const socketError = createAction('[Sockets] Socket Error', props<{ message: string }>());

// Forwarded Event Actions (events received from remote agents namespace)
export const forwardedEventReceived = createAction(
  '[Sockets] Forwarded Event Received',
  props<{ event: string; payload: import('./sockets.types').ForwardedEventPayload }>(),
);

// Agent Actions
export const setAgent = createAction('[Sockets] Set Agent', props<{ agentId: string | null }>());
