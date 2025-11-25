import { inject } from '@angular/core';
import type { Environment } from '@forepath/framework/frontend/util-configuration';
import { ENVIRONMENT } from '@forepath/framework/frontend/util-configuration';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { KeycloakService } from 'keycloak-angular';
import { catchError, from, fromEvent, map, merge, Observable, of, switchMap, tap } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import {
  connectSocket,
  connectSocketFailure,
  connectSocketSuccess,
  disconnectSocket,
  disconnectSocketSuccess,
  forwardedEventReceived,
  forwardEventSuccess,
  setClientSuccess,
  socketError,
} from './sockets.actions';
import type { ForwardedEventPayload } from './sockets.types';

/**
 * Socket.IO internal events that should not be forwarded or handled as application events
 */
const INTERNAL_EVENTS = new Set([
  'connect',
  'disconnect',
  'connect_error',
  'reconnect',
  'reconnect_attempt',
  'reconnecting',
  'reconnect_error',
  'reconnect_failed',
  'ping',
  'pong',
]);

/**
 * Gets the authentication header for socket connection
 * Returns an Observable since getToken() is async
 */
function getAuthHeader(environment: Environment, keycloakService: KeycloakService | null): Observable<string | null> {
  if (environment.authentication.type === 'api-key') {
    const apiKey = environment.authentication.apiKey;
    if (apiKey) {
      return of(`Bearer ${apiKey}`);
    }
    return of(null);
  } else if (environment.authentication.type === 'keycloak' && keycloakService) {
    // getToken() returns a Promise, so we need to handle it asynchronously
    return from(keycloakService.getToken()).pipe(
      map((token) => (token ? `Bearer ${token}` : null)),
      catchError((error) => {
        console.warn('Failed to get Keycloak token:', error);
        return of(null);
      }),
    );
  }
  return of(null);
}

/**
 * Global socket instance - managed by the connect effect
 * This is a shared reference that will be used by the facade for emitting events
 */
let socketInstance: Socket | null = null;

/**
 * Get the current socket instance (for use in facade/service)
 */
export function getSocketInstance(): Socket | null {
  return socketInstance;
}

/**
 * Effect to connect to the socket
 */
export const connectSocket$ = createEffect(
  (
    actions$ = inject(Actions),
    environment = inject<Environment>(ENVIRONMENT),
    keycloakService = inject(KeycloakService, { optional: true }),
  ) => {
    return actions$.pipe(
      ofType(connectSocket),
      switchMap(() => {
        const websocketUrl = environment.controller?.websocketUrl;
        if (!websocketUrl) {
          return of(connectSocketFailure({ error: 'WebSocket URL not configured' }));
        }

        // Disconnect existing socket if any
        if (socketInstance) {
          socketInstance.disconnect();
          socketInstance = null;
        }

        // Get auth header (async for Keycloak)
        return getAuthHeader(environment, keycloakService).pipe(
          switchMap((authHeader) => {
            // Create socket connection
            socketInstance = io(websocketUrl, {
              transports: ['websocket'],
              rejectUnauthorized: false,
              ...(authHeader && { extraHeaders: { Authorization: authHeader } }),
            });

            // Handle connection success
            const connectSuccess$ = fromEvent(socketInstance, 'connect').pipe(map(() => connectSocketSuccess()));

            // Handle connection errors
            const connectError$ = fromEvent<Error>(socketInstance, 'connect_error').pipe(
              map((error) => {
                socketInstance = null;
                return connectSocketFailure({ error: error.message || 'Connection failed' });
              }),
            );

            // Handle setClientSuccess event
            const setClientSuccess$ = fromEvent<{ message: string; clientId: string }>(
              socketInstance,
              'setClientSuccess',
            ).pipe(map((data) => setClientSuccess({ message: data.message, clientId: data.clientId })));

            // Handle forwardAck event
            const forwardAck$ = fromEvent<{ received: boolean; event: string }>(socketInstance, 'forwardAck').pipe(
              map((data) => forwardEventSuccess({ received: data.received, event: data.event })),
            );

            // Handle error events (application-level errors, not Socket.IO internal errors)
            const error$ = fromEvent<{ message: string }>(socketInstance, 'error').pipe(
              map((data) => socketError({ message: data.message })),
            );

            // Handle forwarded events from remote agents namespace
            // Listen to all events and filter out internal Socket.IO events
            const forwardedEvents$ = new Observable<{ event: string; payload: ForwardedEventPayload }>((subscriber) => {
              const handler = (event: string, ...args: unknown[]) => {
                // Only forward application-level events, not Socket.IO internal events
                if (!INTERNAL_EVENTS.has(event)) {
                  // Check if it's an internal Socket.IO error (Error instance) vs application error (plain object)
                  if (event === 'error' && args.length > 0 && args[0] instanceof Error) {
                    return; // Don't forward internal Socket.IO errors
                  }
                  // Type assertion: the payload should match ForwardedEventPayload based on event type
                  subscriber.next({ event, payload: (args[0] ?? {}) as ForwardedEventPayload });
                }
              };
              socketInstance?.onAny(handler);
              return () => {
                socketInstance?.offAny(handler);
              };
            }).pipe(map(({ event, payload }) => forwardedEventReceived({ event, payload })));

            // Merge all event streams
            return merge(connectSuccess$, connectError$, setClientSuccess$, forwardAck$, error$, forwardedEvents$).pipe(
              catchError((error) => {
                socketInstance = null;
                return of(connectSocketFailure({ error: error.message || 'Connection error' }));
              }),
            );
          }),
        );
      }),
    );
  },
  { functional: true },
);

/**
 * Effect to disconnect from the socket
 */
export const disconnectSocket$ = createEffect(
  (actions$ = inject(Actions)) => {
    return actions$.pipe(
      ofType(disconnectSocket),
      tap(() => {
        if (socketInstance) {
          socketInstance.disconnect();
          socketInstance = null;
        }
      }),
      map(() => disconnectSocketSuccess()),
    );
  },
  { functional: true },
);
