import { Test, TestingModule } from '@nestjs/testing';
import { ClientsGateway } from './clients.gateway';
import { ClientAgentCredentialsRepository } from './repositories/client-agent-credentials.repository';
import { ClientsRepository } from './repositories/clients.repository';
import { ClientsService } from './services/clients.service';

jest.mock(
  'socket.io-client',
  () => {
    const emit = jest.fn();
    const onAny = jest.fn();
    const handlers: Map<string, Array<(...args: unknown[]) => void>> = new Map();
    const onceHandlers: Map<string, Array<(...args: unknown[]) => void>> = new Map();
    const on = jest.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!handlers.has(event)) {
        handlers.set(event, []);
      }
      handlers.get(event)!.push(handler);
    });
    const once = jest.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!onceHandlers.has(event)) {
        onceHandlers.set(event, []);
      }
      onceHandlers.get(event)!.push(handler);
    });
    const off = jest.fn((event: string, handler?: (...args: unknown[]) => void) => {
      if (handler) {
        const eventHandlers = handlers.get(event);
        if (eventHandlers) {
          const index = eventHandlers.indexOf(handler);
          if (index > -1) {
            eventHandlers.splice(index, 1);
          }
        }
        const eventOnceHandlers = onceHandlers.get(event);
        if (eventOnceHandlers) {
          const index = eventOnceHandlers.indexOf(handler);
          if (index > -1) {
            eventOnceHandlers.splice(index, 1);
          }
        }
      } else {
        handlers.delete(event);
        onceHandlers.delete(event);
      }
    });
    const disconnect = jest.fn();
    const removeAllListeners = jest.fn(() => {
      handlers.clear();
      onceHandlers.clear();
    });
    const triggerEvent = (event: string, ...args: unknown[]) => {
      // Trigger once handlers first (they're removed after first call)
      const onceHandlersForEvent = onceHandlers.get(event);
      if (onceHandlersForEvent) {
        onceHandlersForEvent.forEach((handler) => handler(...args));
        onceHandlers.delete(event);
      }
      // Trigger regular handlers
      const handlersForEvent = handlers.get(event);
      if (handlersForEvent) {
        handlersForEvent.forEach((handler) => handler(...args));
      }
    };
    const remote = {
      id: 'remote-1',
      emit,
      onAny,
      on,
      once,
      off,
      disconnect,
      removeAllListeners,
      disconnected: false,
      connected: true, // Default to connected so setClientSuccess emits immediately
      triggerEvent, // Helper to trigger events in tests
    };
    return { io: jest.fn(() => remote) };
  },
  { virtual: true },
);

describe('ClientsGateway', () => {
  let gateway: ClientsGateway;
  let clientsService: jest.Mocked<ClientsService>;
  let clientsRepository: jest.Mocked<ClientsRepository>;
  let credentialsRepo: jest.Mocked<ClientAgentCredentialsRepository>;

  const mockClientsService = {
    findOne: jest.fn(),
  };

  const mockClientsRepository = {
    findByIdOrThrow: jest.fn(),
  };

  const mockCredentialsRepo = {
    findByClientAndAgent: jest.fn(),
  };

  const createMockSocket = (id = 'socket-1') => {
    const emitted: Record<string, unknown>[] = [];
    return {
      id,
      emit: jest.fn((event: string, payload: unknown) => emitted.push({ event, payload })),
      getEmitted: () => emitted,
    } as any;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsGateway,
        { provide: ClientsService, useValue: mockClientsService },
        { provide: ClientsRepository, useValue: mockClientsRepository },
        { provide: ClientAgentCredentialsRepository, useValue: mockCredentialsRepo },
      ],
    }).compile();

    gateway = module.get(ClientsGateway);
    clientsService = module.get(ClientsService);
    clientsRepository = module.get(ClientsRepository);
    credentialsRepo = module.get(ClientAgentCredentialsRepository);
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeInstanceOf(ClientsGateway);
  });

  it('should set client on setClient and emit success', async () => {
    const socket = createMockSocket();
    mockClientsRepository.findByIdOrThrow.mockResolvedValue({
      id: 'client-uuid',
      endpoint: 'http://localhost:3100/api',
      authenticationType: 'api_key',
      apiKey: 'x',
      agentWsPort: 8099,
    } as any);
    await gateway.handleSetClient({ clientId: 'client-uuid' }, socket);
    expect(clientsRepository.findByIdOrThrow).toHaveBeenCalledWith('client-uuid');
    expect(socket.emit).toHaveBeenCalledWith('setClientSuccess', expect.objectContaining({ clientId: 'client-uuid' }));
    const { io } = jest.requireMock('socket.io-client') as { io: jest.Mock };
    expect(io).toHaveBeenCalledWith(
      'http://localhost:8099/agents',
      expect.objectContaining({
        extraHeaders: expect.objectContaining({ Authorization: expect.stringMatching(/^Bearer /) }),
      }),
    );
  });

  it('should emit error on setClient when missing clientId', async () => {
    const socket = createMockSocket();
    await gateway.handleSetClient({} as any, socket);
    expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({ message: expect.any(String) }));
  });

  it('should emit error on setClient when findOne throws', async () => {
    const socket = createMockSocket();
    mockClientsRepository.findByIdOrThrow.mockRejectedValue(new Error('not found'));
    await gateway.handleSetClient({ clientId: 'bad' }, socket);
    expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({ message: 'not found' }));
  });

  it('should emit error on forward without setClient', async () => {
    const socket = createMockSocket();
    await gateway.handleForward({ event: 'chat', payload: {} }, socket);
    expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({ message: expect.any(String) }));
  });

  it('should ack forward when client is set', async () => {
    const socket = createMockSocket();
    mockClientsRepository.findByIdOrThrow.mockResolvedValue({
      id: 'client-uuid',
      endpoint: 'http://localhost:3100/api',
      authenticationType: 'api_key',
      apiKey: 'x',
      agentWsPort: 8099,
    } as any);
    await gateway.handleSetClient({ clientId: 'client-uuid' }, socket);
    const { io } = jest.requireMock('socket.io-client') as { io: jest.Mock };
    const remote = io();
    await gateway.handleForward({ event: 'chat', payload: { text: 'hi' } }, socket);
    expect(remote.emit).toHaveBeenCalledWith('chat', { text: 'hi' });
    expect(socket.emit).toHaveBeenCalledWith('forwardAck', expect.objectContaining({ received: true, event: 'chat' }));
  });

  it('should wait for login success before forwarding when agentId provided', async () => {
    const socket = createMockSocket();
    const { io } = jest.requireMock('socket.io-client') as { io: jest.Mock };
    const remote = io() as any;
    mockClientsRepository.findByIdOrThrow.mockResolvedValue({
      id: 'client-uuid',
      endpoint: 'http://localhost:3100/api',
      authenticationType: 'api_key',
      apiKey: 'x',
      agentWsPort: 8099,
    } as any);
    mockCredentialsRepo.findByClientAndAgent.mockResolvedValue({
      id: 'cred-1',
      clientId: 'client-uuid',
      agentId: 'agent-uuid',
      password: 'password123',
    } as any);
    await gateway.handleSetClient({ clientId: 'client-uuid' }, socket);
    // Start forward (will trigger login)
    const forwardPromise = gateway.handleForward(
      { event: 'chat', payload: { message: 'hi' }, agentId: 'agent-uuid' },
      socket,
    );
    // Wait for handlers to be registered (handlers are registered in Promise constructor)
    // Use setImmediate to ensure the Promise constructor has executed
    await new Promise((resolve) => setImmediate(resolve));
    // Simulate loginSuccess event being emitted from remote
    // This should trigger the once('loginSuccess') handler
    remote.triggerEvent('loginSuccess');
    await forwardPromise;
    expect(remote.emit).toHaveBeenCalledWith('login', { agentId: 'agent-uuid', password: 'password123' });
    expect(remote.emit).toHaveBeenCalledWith('chat', { message: 'hi' });
    expect(socket.emit).toHaveBeenCalledWith('forwardAck', expect.objectContaining({ received: true, event: 'chat' }));
  });

  it('should override login payload with credentials from database when event is login', async () => {
    const socket = createMockSocket();
    const { io } = jest.requireMock('socket.io-client') as { io: jest.Mock };
    const remote = io() as any;
    mockClientsRepository.findByIdOrThrow.mockResolvedValue({
      id: 'client-uuid',
      endpoint: 'http://localhost:3100/api',
      authenticationType: 'api_key',
      apiKey: 'x',
      agentWsPort: 8099,
    } as any);
    mockCredentialsRepo.findByClientAndAgent.mockResolvedValue({
      id: 'cred-1',
      clientId: 'client-uuid',
      agentId: 'agent-uuid',
      password: 'password123',
    } as any);
    await gateway.handleSetClient({ clientId: 'client-uuid' }, socket);
    // Forward login event with agentId (payload will be overridden)
    const forwardPromise = gateway.handleForward({ event: 'login', payload: {}, agentId: 'agent-uuid' }, socket);
    // Wait for handlers to be registered
    await new Promise((resolve) => setImmediate(resolve));
    // Simulate loginSuccess event
    remote.triggerEvent('loginSuccess');
    await forwardPromise;
    // Should use credentials from database, not user-provided payload
    expect(remote.emit).toHaveBeenCalledWith('login', { agentId: 'agent-uuid', password: 'password123' });
    // Should not forward login event again (already emitted)
    expect(remote.emit).toHaveBeenCalledTimes(1);
    expect(socket.emit).toHaveBeenCalledWith('forwardAck', expect.objectContaining({ received: true, event: 'login' }));
  });

  it('should always use credentials from database for login event even if agent is already logged in', async () => {
    const socket = createMockSocket();
    const { io } = jest.requireMock('socket.io-client') as { io: jest.Mock };
    const remote = io() as any;
    mockClientsRepository.findByIdOrThrow.mockResolvedValue({
      id: 'client-uuid',
      endpoint: 'http://localhost:3100/api',
      authenticationType: 'api_key',
      apiKey: 'x',
      agentWsPort: 8099,
    } as any);
    mockCredentialsRepo.findByClientAndAgent.mockResolvedValue({
      id: 'cred-1',
      clientId: 'client-uuid',
      agentId: 'agent-uuid',
      password: 'password123',
    } as any);
    await gateway.handleSetClient({ clientId: 'client-uuid' }, socket);
    // First login to mark agent as logged in
    const firstLoginPromise = gateway.handleForward({ event: 'login', payload: {}, agentId: 'agent-uuid' }, socket);
    await new Promise((resolve) => setImmediate(resolve));
    remote.triggerEvent('loginSuccess');
    await firstLoginPromise;
    // Clear mock calls
    remote.emit.mockClear();
    // Now send login again with a different payload - should still use credentials from database
    const secondLoginPromise = gateway.handleForward(
      { event: 'login', payload: { agentId: 'wrong', password: 'wrong' }, agentId: 'agent-uuid' },
      socket,
    );
    await new Promise((resolve) => setImmediate(resolve));
    remote.triggerEvent('loginSuccess');
    await secondLoginPromise;
    // Should still use credentials from database, not user-provided payload
    expect(remote.emit).toHaveBeenCalledWith('login', { agentId: 'agent-uuid', password: 'password123' });
    expect(remote.emit).toHaveBeenCalledTimes(1);
    expect(socket.emit).toHaveBeenCalledWith('forwardAck', expect.objectContaining({ received: true, event: 'login' }));
  });
});
