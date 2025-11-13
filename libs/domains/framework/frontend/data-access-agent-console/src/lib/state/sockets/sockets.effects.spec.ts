import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { provideMockActions } from '@ngrx/effects/testing';
import { ENVIRONMENT } from '@forepath/framework/frontend/util-configuration';
import { of, throwError } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import {
  connectSocket,
  connectSocketFailure,
  connectSocketSuccess,
  disconnectSocket,
  disconnectSocketSuccess,
  forwardEventSuccess,
  forwardedEventReceived,
  setClientSuccess,
  socketError,
} from './sockets.actions';
import { connectSocket$, disconnectSocket$, getSocketInstance } from './sockets.effects';
import { ChatActor, type ForwardedEventPayload } from './sockets.types';

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  io: jest.fn(),
}));

// Mock KeycloakService to avoid ES module import issues in Jest
jest.mock('keycloak-angular', () => ({
  KeycloakService: jest.fn(),
}));

import { KeycloakService } from 'keycloak-angular';

describe('SocketsEffects', () => {
  let actions$: Actions;
  let mockSocket: jest.Mocked<Partial<Socket>>;
  let mockEnvironment: any;
  let mockKeycloakService: jest.Mocked<Partial<KeycloakService>>;

  const mockForwardedPayload: ForwardedEventPayload = {
    success: true,
    data: {
      from: ChatActor.USER,
      text: 'Test message',
      timestamp: '2024-01-01T00:00:00Z',
    },
    timestamp: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    mockSocket = {
      connected: true,
      disconnected: false,
      on: jest.fn(),
      once: jest.fn(),
      off: jest.fn(),
      onAny: jest.fn(),
      offAny: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
    };

    (io as jest.Mock).mockReturnValue(mockSocket as any);

    mockEnvironment = {
      controller: {
        websocketUrl: 'http://localhost:8081/clients',
      },
      authentication: {
        type: 'api-key',
        apiKey: 'test-api-key',
      },
    };

    mockKeycloakService = {
      getToken: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideMockActions(() => actions$),
        {
          provide: ENVIRONMENT,
          useValue: mockEnvironment,
        },
        {
          provide: KeycloakService,
          useValue: mockKeycloakService,
        },
      ],
    });

    actions$ = TestBed.inject(Actions);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('connectSocket$', () => {
    it('should return connectSocketFailure when websocketUrl is not configured', (done) => {
      const environmentWithoutUrl = {
        ...mockEnvironment,
        controller: {},
      };

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideMockActions(() => actions$),
          {
            provide: ENVIRONMENT,
            useValue: environmentWithoutUrl,
          },
        ],
      });

      const action = connectSocket();
      actions$ = of(action);

      connectSocket$(actions$, TestBed.inject(ENVIRONMENT), null).subscribe((result) => {
        expect(result).toEqual(connectSocketFailure({ error: 'WebSocket URL not configured' }));
        done();
      });
    });

    it('should create socket connection with API key authentication', (done) => {
      const action = connectSocket();
      actions$ = of(action);

      // Mock connect event
      let connectHandler: () => void;
      (mockSocket.on as jest.Mock).mockImplementation((event: string, handler: () => void) => {
        if (event === 'connect') {
          connectHandler = handler;
          // Simulate immediate connection
          setTimeout(() => handler(), 0);
        }
        return mockSocket as any;
      });

      connectSocket$(actions$, TestBed.inject(ENVIRONMENT), null).subscribe((result) => {
        expect(io).toHaveBeenCalledWith('http://localhost:8081/clients', {
          transports: ['websocket'],
          extraHeaders: { Authorization: 'Bearer test-api-key' },
        });
        expect(result).toEqual(connectSocketSuccess());
        done();
      });
    });

    it('should create socket connection with Keycloak authentication', (done) => {
      const keycloakEnvironment = {
        ...mockEnvironment,
        authentication: {
          type: 'keycloak',
        },
      };

      mockKeycloakService.getToken = jest.fn().mockResolvedValue('keycloak-token-123');

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideMockActions(() => actions$),
          {
            provide: ENVIRONMENT,
            useValue: keycloakEnvironment,
          },
          {
            provide: KeycloakService,
            useValue: mockKeycloakService,
          },
        ],
      });

      const action = connectSocket();
      actions$ = of(action);

      // Mock connect event
      (mockSocket.on as jest.Mock).mockImplementation((event: string, handler: () => void) => {
        if (event === 'connect') {
          setTimeout(() => handler(), 0);
        }
        return mockSocket as any;
      });

      connectSocket$(actions$, TestBed.inject(ENVIRONMENT), TestBed.inject(KeycloakService)).subscribe((result) => {
        expect(io).toHaveBeenCalledWith('http://localhost:8081/clients', {
          transports: ['websocket'],
          extraHeaders: { Authorization: 'Bearer keycloak-token-123' },
        });
        expect(result).toEqual(connectSocketSuccess());
        done();
      });
    });

    it('should return connectSocketFailure on connection error', (done) => {
      const action = connectSocket();
      actions$ = of(action);

      // Mock connect_error event
      (mockSocket.on as jest.Mock).mockImplementation((event: string, handler: (error: Error) => void) => {
        if (event === 'connect_error') {
          setTimeout(() => handler(new Error('Connection failed')), 0);
        }
        return mockSocket as any;
      });

      connectSocket$(actions$, TestBed.inject(ENVIRONMENT), null).subscribe((result) => {
        expect(result).toEqual(connectSocketFailure({ error: 'Connection failed' }));
        done();
      });
    });

    it('should handle setClientSuccess event', (done) => {
      const action = connectSocket();
      actions$ = of(action);

      const setClientSuccessData = { message: 'Client set', clientId: 'client-1' };

      // Mock setClientSuccess event
      (mockSocket.on as jest.Mock).mockImplementation((event: string, handler: any) => {
        if (event === 'setClientSuccess') {
          setTimeout(() => handler(setClientSuccessData), 0);
        }
        if (event === 'connect') {
          setTimeout(() => handler(), 0);
        }
        return mockSocket as any;
      });

      connectSocket$(actions$, TestBed.inject(ENVIRONMENT), null).subscribe((result) => {
        if (result.type === '[Sockets] Set Client Success') {
          expect(result).toEqual(setClientSuccess(setClientSuccessData));
          done();
        }
      });
    });

    it('should handle forwardAck event', (done) => {
      const action = connectSocket();
      actions$ = of(action);

      const forwardAckData = { received: true, event: 'chat' };

      // Mock forwardAck event
      (mockSocket.on as jest.Mock).mockImplementation((event: string, handler: any) => {
        if (event === 'forwardAck') {
          setTimeout(() => handler(forwardAckData), 0);
        }
        if (event === 'connect') {
          setTimeout(() => handler(), 0);
        }
        return mockSocket as any;
      });

      connectSocket$(actions$, TestBed.inject(ENVIRONMENT), null).subscribe((result) => {
        if (result.type === '[Sockets] Forward Event Success') {
          expect(result).toEqual(forwardEventSuccess(forwardAckData));
          done();
        }
      });
    });

    it('should handle error event', (done) => {
      const action = connectSocket();
      actions$ = of(action);

      const errorData = { message: 'Socket error' };

      // Mock error event
      (mockSocket.on as jest.Mock).mockImplementation((event: string, handler: any) => {
        if (event === 'error') {
          setTimeout(() => handler(errorData), 0);
        }
        if (event === 'connect') {
          setTimeout(() => handler(), 0);
        }
        return mockSocket as any;
      });

      connectSocket$(actions$, TestBed.inject(ENVIRONMENT), null).subscribe((result) => {
        if (result.type === '[Sockets] Socket Error') {
          expect(result).toEqual(socketError(errorData));
          done();
        }
      });
    });

    it('should handle forwarded events and filter out internal events', (done) => {
      const action = connectSocket();
      actions$ = of(action);

      let onAnyHandler: (event: string, ...args: unknown[]) => void;

      // Mock onAny handler
      (mockSocket.onAny as jest.Mock).mockImplementation((handler: (event: string, ...args: unknown[]) => void) => {
        onAnyHandler = handler;
        return mockSocket as any;
      });

      // Mock connect event
      (mockSocket.on as jest.Mock).mockImplementation((event: string, handler: () => void) => {
        if (event === 'connect') {
          setTimeout(() => {
            handler();
            // Simulate forwarded event
            if (onAnyHandler) {
              onAnyHandler('chatMessage', mockForwardedPayload);
            }
          }, 0);
        }
        return mockSocket as any;
      });

      connectSocket$(actions$, TestBed.inject(ENVIRONMENT), null).subscribe((result) => {
        if (result.type === '[Sockets] Forwarded Event Received') {
          expect(result).toEqual(forwardedEventReceived({ event: 'chatMessage', payload: mockForwardedPayload }));
          done();
        }
      });
    });

    it('should not forward internal Socket.IO events', (done) => {
      const action = connectSocket();
      actions$ = of(action);

      let onAnyHandler: (event: string, ...args: unknown[]) => void;
      let forwardedEventCount = 0;

      // Mock onAny handler
      (mockSocket.onAny as jest.Mock).mockImplementation((handler: (event: string, ...args: unknown[]) => void) => {
        onAnyHandler = handler;
        return mockSocket as any;
      });

      // Mock connect event
      (mockSocket.on as jest.Mock).mockImplementation((event: string, handler: () => void) => {
        if (event === 'connect') {
          setTimeout(() => {
            handler();
            // Simulate internal events (should be filtered out)
            if (onAnyHandler) {
              onAnyHandler('connect', {});
              onAnyHandler('ping', {});
              onAnyHandler('pong', {});
              // Simulate application event (should be forwarded)
              onAnyHandler('chatMessage', mockForwardedPayload);
            }
          }, 0);
        }
        return mockSocket as any;
      });

      connectSocket$(actions$, TestBed.inject(ENVIRONMENT), null).subscribe((result) => {
        if (result.type === '[Sockets] Forwarded Event Received') {
          forwardedEventCount++;
          expect(result).toEqual(forwardedEventReceived({ event: 'chatMessage', payload: mockForwardedPayload }));
          expect(forwardedEventCount).toBe(1); // Only one forwarded event
          done();
        }
      });
    });
  });

  describe('disconnectSocket$', () => {
    it('should disconnect socket and return disconnectSocketSuccess', (done) => {
      // First connect to create socket instance
      const connectAction = connectSocket();
      actions$ = of(connectAction);

      // Mock connect event to establish connection
      (mockSocket.on as jest.Mock).mockImplementation((event: string, handler: () => void) => {
        if (event === 'connect') {
          setTimeout(() => handler(), 0);
        }
        return mockSocket as any;
      });

      // Connect first
      connectSocket$(actions$, TestBed.inject(ENVIRONMENT), null).subscribe(() => {
        // Now test disconnect
        const disconnectAction = disconnectSocket();
        actions$ = of(disconnectAction);

        disconnectSocket$(actions$).subscribe((result) => {
          expect(mockSocket.disconnect).toHaveBeenCalled();
          expect(result).toEqual(disconnectSocketSuccess());
          done();
        });
      });
    });

    it('should handle case when socket is null', (done) => {
      const action = disconnectSocket();
      actions$ = of(action);

      disconnectSocket$(actions$).subscribe((result) => {
        expect(result).toEqual(disconnectSocketSuccess());
        done();
      });
    });
  });
});
