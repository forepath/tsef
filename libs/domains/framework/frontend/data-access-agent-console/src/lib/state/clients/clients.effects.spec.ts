import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { provideMockActions } from '@ngrx/effects/testing';
import { of, throwError } from 'rxjs';
import { ClientsService } from '../../services/clients.service';
import {
  createClient,
  createClientFailure,
  createClientSuccess,
  deleteClient,
  deleteClientFailure,
  deleteClientSuccess,
  loadClient,
  loadClientFailure,
  loadClients,
  loadClientsBatch,
  loadClientsFailure,
  loadClientsSuccess,
  loadClientSuccess,
  loadServerInfo,
  loadServerInfoFailure,
  loadServerInfoSuccess,
  setActiveClient,
  setActiveClientSuccess,
  updateClient,
  updateClientFailure,
  updateClientSuccess,
} from './clients.actions';
import {
  createClient$,
  deleteClient$,
  loadClient$,
  loadClients$,
  loadClientsBatch$,
  loadServerInfo$,
  setActiveClient$,
  updateClient$,
} from './clients.effects';
import type {
  ClientResponseDto,
  CreateClientDto,
  CreateClientResponseDto,
  ServerInfo,
  UpdateClientDto,
} from './clients.types';

describe('ClientsEffects', () => {
  let actions$: Actions;
  let clientsService: jest.Mocked<ClientsService>;

  const mockClient: ClientResponseDto = {
    id: 'client-1',
    name: 'Test Client',
    description: 'Test Description',
    endpoint: 'https://example.com/api',
    authenticationType: 'api_key',
    config: {
      gitRepositoryUrl: 'https://github.com/user/repo.git',
      agentTypes: [{ type: 'cursor', displayName: 'Cursor' }],
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockCreateClientResponse: CreateClientResponseDto = {
    ...mockClient,
    apiKey: 'generated-api-key',
  };

  beforeEach(() => {
    clientsService = {
      listClients: jest.fn(),
      getClient: jest.fn(),
      createClient: jest.fn(),
      updateClient: jest.fn(),
      deleteClient: jest.fn(),
      getServerInfo: jest.fn(),
    } as any;

    TestBed.configureTestingModule({
      providers: [
        provideMockActions(() => actions$),
        {
          provide: ClientsService,
          useValue: clientsService,
        },
      ],
    });

    actions$ = TestBed.inject(Actions);
  });

  describe('loadClients$', () => {
    it('should return loadClientsSuccess when batch is empty', (done) => {
      const clients: ClientResponseDto[] = [];
      const action = loadClients({});
      const outcome = loadClientsSuccess({ clients: [] });

      actions$ = of(action);
      clientsService.listClients.mockReturnValue(of(clients));

      loadClients$(actions$, clientsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(clientsService.listClients).toHaveBeenCalledWith({ limit: 10, offset: 0 });
        done();
      });
    });

    it('should return loadClientsSuccess when batch is partial (< 10)', (done) => {
      const clients: ClientResponseDto[] = [mockClient];
      const action = loadClients({});
      const outcome = loadClientsSuccess({ clients });

      actions$ = of(action);
      clientsService.listClients.mockReturnValue(of(clients));

      loadClients$(actions$, clientsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(clientsService.listClients).toHaveBeenCalledWith({ limit: 10, offset: 0 });
        done();
      });
    });

    it('should return loadClientsBatch when batch is full (10 entries)', (done) => {
      const clients: ClientResponseDto[] = Array.from({ length: 10 }, (_, i) => ({
        ...mockClient,
        id: `client-${i}`,
      }));
      const action = loadClients({});
      const outcome = loadClientsBatch({ offset: 10, accumulatedClients: clients });

      actions$ = of(action);
      clientsService.listClients.mockReturnValue(of(clients));

      loadClients$(actions$, clientsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(clientsService.listClients).toHaveBeenCalledWith({ limit: 10, offset: 0 });
        done();
      });
    });

    it('should ignore user params and use batch params', (done) => {
      const params = { limit: 5, offset: 20 };
      const action = loadClients({ params });
      const clients: ClientResponseDto[] = [mockClient];

      actions$ = of(action);
      clientsService.listClients.mockReturnValue(of(clients));

      loadClients$(actions$, clientsService).subscribe(() => {
        expect(clientsService.listClients).toHaveBeenCalledWith({ limit: 10, offset: 0 });
        done();
      });
    });

    it('should return loadClientsFailure on error', (done) => {
      const action = loadClients({});
      const error = new Error('Load failed');
      const outcome = loadClientsFailure({ error: 'Load failed' });

      actions$ = of(action);
      clientsService.listClients.mockReturnValue(throwError(() => error));

      loadClients$(actions$, clientsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('loadClientsBatch$', () => {
    it('should return loadClientsSuccess when batch is empty', (done) => {
      const accumulatedClients: ClientResponseDto[] = [mockClient];
      const newClients: ClientResponseDto[] = [];
      const action = loadClientsBatch({ offset: 10, accumulatedClients });
      const outcome = loadClientsSuccess({ clients: accumulatedClients });

      actions$ = of(action);
      clientsService.listClients.mockReturnValue(of(newClients));

      loadClientsBatch$(actions$, clientsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(clientsService.listClients).toHaveBeenCalledWith({ limit: 10, offset: 10 });
        done();
      });
    });

    it('should return loadClientsSuccess when batch is partial (< 10)', (done) => {
      const accumulatedClients: ClientResponseDto[] = [mockClient];
      const newClients: ClientResponseDto[] = [{ ...mockClient, id: 'client-2' }];
      const action = loadClientsBatch({ offset: 10, accumulatedClients });
      const outcome = loadClientsSuccess({ clients: [...accumulatedClients, ...newClients] });

      actions$ = of(action);
      clientsService.listClients.mockReturnValue(of(newClients));

      loadClientsBatch$(actions$, clientsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(clientsService.listClients).toHaveBeenCalledWith({ limit: 10, offset: 10 });
        done();
      });
    });

    it('should return loadClientsBatch when batch is full (10 entries)', (done) => {
      const accumulatedClients: ClientResponseDto[] = Array.from({ length: 10 }, (_, i) => ({
        ...mockClient,
        id: `client-${i}`,
      }));
      const newClients: ClientResponseDto[] = Array.from({ length: 10 }, (_, i) => ({
        ...mockClient,
        id: `client-${i + 10}`,
      }));
      const action = loadClientsBatch({ offset: 10, accumulatedClients });
      const outcome = loadClientsBatch({
        offset: 20,
        accumulatedClients: [...accumulatedClients, ...newClients],
      });

      actions$ = of(action);
      clientsService.listClients.mockReturnValue(of(newClients));

      loadClientsBatch$(actions$, clientsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(clientsService.listClients).toHaveBeenCalledWith({ limit: 10, offset: 10 });
        done();
      });
    });

    it('should return loadClientsFailure on error', (done) => {
      const accumulatedClients: ClientResponseDto[] = [mockClient];
      const action = loadClientsBatch({ offset: 10, accumulatedClients });
      const error = new Error('Load failed');
      const outcome = loadClientsFailure({ error: 'Load failed' });

      actions$ = of(action);
      clientsService.listClients.mockReturnValue(throwError(() => error));

      loadClientsBatch$(actions$, clientsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('loadClient$', () => {
    it('should return loadClientSuccess on success', (done) => {
      const action = loadClient({ id: 'client-1' });
      const outcome = loadClientSuccess({ client: mockClient });

      actions$ = of(action);
      clientsService.getClient.mockReturnValue(of(mockClient));

      loadClient$(actions$, clientsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should return loadClientFailure on error', (done) => {
      const action = loadClient({ id: 'client-1' });
      const error = new Error('Load failed');
      const outcome = loadClientFailure({ error: 'Load failed' });

      actions$ = of(action);
      clientsService.getClient.mockReturnValue(throwError(() => error));

      loadClient$(actions$, clientsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('createClient$', () => {
    it('should return createClientSuccess on success', (done) => {
      const createDto: CreateClientDto = {
        name: 'New Client',
        endpoint: 'https://example.com/api',
        authenticationType: 'api_key',
      };
      const action = createClient({ client: createDto });
      const outcome = createClientSuccess({ client: mockCreateClientResponse });

      actions$ = of(action);
      clientsService.createClient.mockReturnValue(of(mockCreateClientResponse));

      createClient$(actions$, clientsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should return createClientFailure on error', (done) => {
      const createDto: CreateClientDto = {
        name: 'New Client',
        endpoint: 'https://example.com/api',
        authenticationType: 'api_key',
      };
      const action = createClient({ client: createDto });
      const error = new Error('Create failed');
      const outcome = createClientFailure({ error: 'Create failed' });

      actions$ = of(action);
      clientsService.createClient.mockReturnValue(throwError(() => error));

      createClient$(actions$, clientsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('updateClient$', () => {
    it('should return updateClientSuccess on success', (done) => {
      const updateDto: UpdateClientDto = { name: 'Updated Client' };
      const action = updateClient({ id: 'client-1', client: updateDto });
      const updatedClient = { ...mockClient, name: 'Updated Client' };
      const outcome = updateClientSuccess({ client: updatedClient });

      actions$ = of(action);
      clientsService.updateClient.mockReturnValue(of(updatedClient));

      updateClient$(actions$, clientsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should return updateClientFailure on error', (done) => {
      const updateDto: UpdateClientDto = { name: 'Updated Client' };
      const action = updateClient({ id: 'client-1', client: updateDto });
      const error = new Error('Update failed');
      const outcome = updateClientFailure({ error: 'Update failed' });

      actions$ = of(action);
      clientsService.updateClient.mockReturnValue(throwError(() => error));

      updateClient$(actions$, clientsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('deleteClient$', () => {
    it('should return deleteClientSuccess on success', (done) => {
      const action = deleteClient({ id: 'client-1' });
      const outcome = deleteClientSuccess({ id: 'client-1' });

      actions$ = of(action);
      clientsService.deleteClient.mockReturnValue(of(undefined));

      deleteClient$(actions$, clientsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should return deleteClientFailure on error', (done) => {
      const action = deleteClient({ id: 'client-1' });
      const error = new Error('Delete failed');
      const outcome = deleteClientFailure({ error: 'Delete failed' });

      actions$ = of(action);
      clientsService.deleteClient.mockReturnValue(throwError(() => error));

      deleteClient$(actions$, clientsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('setActiveClient$', () => {
    it('should return setActiveClientSuccess', (done) => {
      const action = setActiveClient({ id: 'client-1' });
      const outcome = setActiveClientSuccess({ id: 'client-1' });

      actions$ = of(action);

      setActiveClient$(actions$).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('error normalization', () => {
    it('should normalize Error objects', (done) => {
      const action = loadClients({});
      const error = new Error('Test error');
      const outcome = loadClientsFailure({ error: 'Test error' });

      actions$ = of(action);
      clientsService.listClients.mockReturnValue(throwError(() => error));

      loadClients$(actions$, clientsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should normalize string errors', (done) => {
      const action = loadClients({});
      const error = 'String error';
      const outcome = loadClientsFailure({ error: 'String error' });

      actions$ = of(action);
      clientsService.listClients.mockReturnValue(throwError(() => error));

      loadClients$(actions$, clientsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should normalize object errors with message property', (done) => {
      const action = loadClients({});
      const error = { message: 'Object error' };
      const outcome = loadClientsFailure({ error: 'Object error' });

      actions$ = of(action);
      clientsService.listClients.mockReturnValue(throwError(() => error));

      loadClients$(actions$, clientsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should use default error message for unknown error types', (done) => {
      const action = loadClients({});
      const error = { unknown: 'property' };
      const outcome = loadClientsFailure({ error: 'An unexpected error occurred' });

      actions$ = of(action);
      clientsService.listClients.mockReturnValue(throwError(() => error));

      loadClients$(actions$, clientsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('loadServerInfo$', () => {
    const mockServerInfo: ServerInfo = {
      serverId: 'server-1',
      serverName: 'Test Server',
      publicIp: '1.2.3.4',
      providerType: 'hetzner',
    };

    it('should return loadServerInfoSuccess on success', (done) => {
      const action = loadServerInfo({ clientId: 'client-1' });
      const outcome = loadServerInfoSuccess({ clientId: 'client-1', serverInfo: mockServerInfo });

      actions$ = of(action);
      clientsService.getServerInfo.mockReturnValue(of(mockServerInfo));

      loadServerInfo$(actions$, clientsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(clientsService.getServerInfo).toHaveBeenCalledWith('client-1');
        done();
      });
    });

    it('should return loadServerInfoFailure with empty error for 404 (no provisioning)', (done) => {
      const action = loadServerInfo({ clientId: 'client-1' });
      const error = new HttpErrorResponse({ status: 404, statusText: 'Not Found' });
      const outcome = loadServerInfoFailure({ clientId: 'client-1', error: '' });

      actions$ = of(action);
      clientsService.getServerInfo.mockReturnValue(throwError(() => error));

      loadServerInfo$(actions$, clientsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(clientsService.getServerInfo).toHaveBeenCalledWith('client-1');
        done();
      });
    });

    it('should return loadServerInfoFailure with error message for non-404 errors', (done) => {
      const action = loadServerInfo({ clientId: 'client-1' });
      const error = new Error('Network error');
      const outcome = loadServerInfoFailure({ clientId: 'client-1', error: 'Network error' });

      actions$ = of(action);
      clientsService.getServerInfo.mockReturnValue(throwError(() => error));

      loadServerInfo$(actions$, clientsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(clientsService.getServerInfo).toHaveBeenCalledWith('client-1');
        done();
      });
    });

    it('should handle multiple concurrent requests for different clients', (done) => {
      const action1 = loadServerInfo({ clientId: 'client-1' });
      const action2 = loadServerInfo({ clientId: 'client-2' });
      const mockServerInfo2: ServerInfo = {
        serverId: 'server-2',
        providerType: 'hetzner',
      };

      actions$ = of(action1, action2);
      clientsService.getServerInfo.mockImplementation((clientId: string) => {
        if (clientId === 'client-1') {
          return of(mockServerInfo);
        }
        return of(mockServerInfo2);
      });

      const outcomes = [
        loadServerInfoSuccess({ clientId: 'client-1', serverInfo: mockServerInfo }),
        loadServerInfoSuccess({ clientId: 'client-2', serverInfo: mockServerInfo2 }),
      ];
      const results: any[] = [];

      loadServerInfo$(actions$, clientsService).subscribe({
        next: (result) => {
          results.push(result);
          if (results.length === 2) {
            expect(results).toContainEqual(outcomes[0]);
            expect(results).toContainEqual(outcomes[1]);
            expect(clientsService.getServerInfo).toHaveBeenCalledWith('client-1');
            expect(clientsService.getServerInfo).toHaveBeenCalledWith('client-2');
            done();
          }
        },
      });
    });
  });
});
