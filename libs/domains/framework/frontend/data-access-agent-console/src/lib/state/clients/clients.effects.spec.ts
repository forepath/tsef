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
  loadClientsFailure,
  loadClientsSuccess,
  loadClientSuccess,
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
  setActiveClient$,
  updateClient$,
} from './clients.effects';
import type { ClientResponseDto, CreateClientDto, CreateClientResponseDto, UpdateClientDto } from './clients.types';

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
    it('should return loadClientsSuccess on success', (done) => {
      const clients: ClientResponseDto[] = [mockClient];
      const action = loadClients({});
      const outcome = loadClientsSuccess({ clients });

      actions$ = of(action);
      clientsService.listClients.mockReturnValue(of(clients));

      loadClients$(actions$, clientsService).subscribe((result) => {
        expect(result).toEqual(outcome);
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

    it('should pass params to service', (done) => {
      const params = { limit: 10, offset: 20 };
      const action = loadClients({ params });
      const clients: ClientResponseDto[] = [mockClient];

      actions$ = of(action);
      clientsService.listClients.mockReturnValue(of(clients));

      loadClients$(actions$, clientsService).subscribe(() => {
        expect(clientsService.listClients).toHaveBeenCalledWith(params);
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
});
