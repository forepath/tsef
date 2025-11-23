import {
  clearActiveClient,
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
  setActiveClient,
  setActiveClientFailure,
  setActiveClientSuccess,
  updateClient,
  updateClientFailure,
  updateClientSuccess,
} from './clients.actions';
import { clientsReducer, initialClientsState, type ClientsState } from './clients.reducer';
import type { ClientResponseDto } from './clients.types';

describe('clientsReducer', () => {
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

  const mockClient2: ClientResponseDto = {
    id: 'client-2',
    name: 'Test Client 2',
    endpoint: 'https://example2.com/api',
    authenticationType: 'keycloak',
    config: {
      gitRepositoryUrl: 'https://github.com/user2/repo2.git',
      agentTypes: [{ type: 'cursor', displayName: 'Cursor' }],
    },
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  };

  describe('initial state', () => {
    it('should return the initial state', () => {
      const action = { type: 'UNKNOWN' };
      const state = clientsReducer(undefined, action as any);

      expect(state).toEqual(initialClientsState);
    });
  });

  describe('loadClients', () => {
    it('should set loading to true, clear existing clients, and clear error', () => {
      const state: ClientsState = {
        ...initialClientsState,
        entities: [mockClient],
        error: 'Previous error',
      };

      const newState = clientsReducer(state, loadClients({}));

      expect(newState.loading).toBe(true);
      expect(newState.entities).toEqual([]);
      expect(newState.error).toBeNull();
    });
  });

  describe('loadClientsBatch', () => {
    it('should accumulate clients and keep loading true', () => {
      const state: ClientsState = {
        ...initialClientsState,
        loading: true,
        entities: [mockClient],
      };

      const accumulatedClients = [mockClient, mockClient2];
      const newState = clientsReducer(state, loadClientsBatch({ offset: 10, accumulatedClients }));

      expect(newState.entities).toEqual(accumulatedClients);
      expect(newState.loading).toBe(true);
      expect(newState.error).toBeNull();
    });
  });

  describe('loadClientsSuccess', () => {
    it('should set entities and set loading to false', () => {
      const state: ClientsState = {
        ...initialClientsState,
        loading: true,
      };

      const newState = clientsReducer(state, loadClientsSuccess({ clients: [mockClient, mockClient2] }));

      expect(newState.entities).toEqual([mockClient, mockClient2]);
      expect(newState.loading).toBe(false);
      expect(newState.error).toBeNull();
    });
  });

  describe('loadClientsFailure', () => {
    it('should set error and set loading to false', () => {
      const state: ClientsState = {
        ...initialClientsState,
        loading: true,
      };

      const newState = clientsReducer(state, loadClientsFailure({ error: 'Load failed' }));

      expect(newState.error).toBe('Load failed');
      expect(newState.loading).toBe(false);
    });
  });

  describe('loadClient', () => {
    it('should set loadingClient to true and clear error', () => {
      const state: ClientsState = {
        ...initialClientsState,
        error: 'Previous error',
      };

      const newState = clientsReducer(state, loadClient({ id: 'client-1' }));

      expect(newState.loadingClient).toBe(true);
      expect(newState.error).toBeNull();
    });
  });

  describe('loadClientSuccess', () => {
    it('should set selectedClient and update entity in list', () => {
      const state: ClientsState = {
        ...initialClientsState,
        entities: [mockClient],
        loadingClient: true,
      };

      const updatedClient = { ...mockClient, name: 'Updated Name' };
      const newState = clientsReducer(state, loadClientSuccess({ client: updatedClient }));

      expect(newState.selectedClient).toEqual(updatedClient);
      expect(newState.entities[0]).toEqual(updatedClient);
      expect(newState.loadingClient).toBe(false);
    });

    it('should add client to entities if not present', () => {
      const state: ClientsState = {
        ...initialClientsState,
        entities: [],
        loadingClient: true,
      };

      const newState = clientsReducer(state, loadClientSuccess({ client: mockClient }));

      expect(newState.selectedClient).toEqual(mockClient);
      expect(newState.entities).toContainEqual(mockClient);
    });
  });

  describe('loadClientFailure', () => {
    it('should set error and set loadingClient to false', () => {
      const state: ClientsState = {
        ...initialClientsState,
        loadingClient: true,
      };

      const newState = clientsReducer(state, loadClientFailure({ error: 'Load failed' }));

      expect(newState.error).toBe('Load failed');
      expect(newState.loadingClient).toBe(false);
    });
  });

  describe('createClient', () => {
    it('should set creating to true and clear error', () => {
      const state: ClientsState = {
        ...initialClientsState,
        error: 'Previous error',
      };

      const newState = clientsReducer(state, createClient({ client: {} as any }));

      expect(newState.creating).toBe(true);
      expect(newState.error).toBeNull();
    });
  });

  describe('createClientSuccess', () => {
    it('should add client to entities and set selectedClient', () => {
      const state: ClientsState = {
        ...initialClientsState,
        entities: [mockClient],
        creating: true,
      };

      const newState = clientsReducer(state, createClientSuccess({ client: { ...mockClient2, apiKey: 'key' } }));

      expect(newState.entities).toContainEqual(mockClient2);
      expect(newState.selectedClient).toEqual(mockClient2);
      expect(newState.creating).toBe(false);
    });
  });

  describe('createClientFailure', () => {
    it('should set error and set creating to false', () => {
      const state: ClientsState = {
        ...initialClientsState,
        creating: true,
      };

      const newState = clientsReducer(state, createClientFailure({ error: 'Create failed' }));

      expect(newState.error).toBe('Create failed');
      expect(newState.creating).toBe(false);
    });
  });

  describe('updateClient', () => {
    it('should set updating to true and clear error', () => {
      const state: ClientsState = {
        ...initialClientsState,
        error: 'Previous error',
      };

      const newState = clientsReducer(state, updateClient({ id: 'client-1', client: {} }));

      expect(newState.updating).toBe(true);
      expect(newState.error).toBeNull();
    });
  });

  describe('updateClientSuccess', () => {
    it('should update client in entities', () => {
      const state: ClientsState = {
        ...initialClientsState,
        entities: [mockClient],
        updating: true,
      };

      const updatedClient = { ...mockClient, name: 'Updated Name' };
      const newState = clientsReducer(state, updateClientSuccess({ client: updatedClient }));

      expect(newState.entities[0]).toEqual(updatedClient);
      expect(newState.updating).toBe(false);
    });

    it('should update selectedClient if it matches', () => {
      const state: ClientsState = {
        ...initialClientsState,
        entities: [mockClient],
        selectedClient: mockClient,
        updating: true,
      };

      const updatedClient = { ...mockClient, name: 'Updated Name' };
      const newState = clientsReducer(state, updateClientSuccess({ client: updatedClient }));

      expect(newState.selectedClient).toEqual(updatedClient);
    });

    it('should not update selectedClient if it does not match', () => {
      const state: ClientsState = {
        ...initialClientsState,
        entities: [mockClient, mockClient2],
        selectedClient: mockClient2,
        updating: true,
      };

      const updatedClient = { ...mockClient, name: 'Updated Name' };
      const newState = clientsReducer(state, updateClientSuccess({ client: updatedClient }));

      expect(newState.selectedClient).toEqual(mockClient2);
    });
  });

  describe('updateClientFailure', () => {
    it('should set error and set updating to false', () => {
      const state: ClientsState = {
        ...initialClientsState,
        updating: true,
      };

      const newState = clientsReducer(state, updateClientFailure({ error: 'Update failed' }));

      expect(newState.error).toBe('Update failed');
      expect(newState.updating).toBe(false);
    });
  });

  describe('deleteClient', () => {
    it('should set deleting to true and clear error', () => {
      const state: ClientsState = {
        ...initialClientsState,
        error: 'Previous error',
      };

      const newState = clientsReducer(state, deleteClient({ id: 'client-1' }));

      expect(newState.deleting).toBe(true);
      expect(newState.error).toBeNull();
    });
  });

  describe('deleteClientSuccess', () => {
    it('should remove client from entities', () => {
      const state: ClientsState = {
        ...initialClientsState,
        entities: [mockClient, mockClient2],
        deleting: true,
      };

      const newState = clientsReducer(state, deleteClientSuccess({ id: 'client-1' }));

      expect(newState.entities).not.toContainEqual(mockClient);
      expect(newState.entities).toContainEqual(mockClient2);
      expect(newState.deleting).toBe(false);
    });

    it('should clear selectedClient if it matches deleted id', () => {
      const state: ClientsState = {
        ...initialClientsState,
        entities: [mockClient],
        selectedClient: mockClient,
        deleting: true,
      };

      const newState = clientsReducer(state, deleteClientSuccess({ id: 'client-1' }));

      expect(newState.selectedClient).toBeNull();
    });

    it('should clear activeClientId if it matches deleted id', () => {
      const state: ClientsState = {
        ...initialClientsState,
        entities: [mockClient],
        activeClientId: 'client-1',
        deleting: true,
      };

      const newState = clientsReducer(state, deleteClientSuccess({ id: 'client-1' }));

      expect(newState.activeClientId).toBeNull();
    });
  });

  describe('deleteClientFailure', () => {
    it('should set error and set deleting to false', () => {
      const state: ClientsState = {
        ...initialClientsState,
        deleting: true,
      };

      const newState = clientsReducer(state, deleteClientFailure({ error: 'Delete failed' }));

      expect(newState.error).toBe('Delete failed');
      expect(newState.deleting).toBe(false);
    });
  });

  describe('setActiveClient', () => {
    it('should clear error', () => {
      const state: ClientsState = {
        ...initialClientsState,
        error: 'Previous error',
      };

      const newState = clientsReducer(state, setActiveClient({ id: 'client-1' }));

      expect(newState.error).toBeNull();
    });
  });

  describe('setActiveClientSuccess', () => {
    it('should set activeClientId', () => {
      const state: ClientsState = {
        ...initialClientsState,
      };

      const newState = clientsReducer(state, setActiveClientSuccess({ id: 'client-1' }));

      expect(newState.activeClientId).toBe('client-1');
      expect(newState.error).toBeNull();
    });
  });

  describe('setActiveClientFailure', () => {
    it('should set error', () => {
      const state: ClientsState = {
        ...initialClientsState,
      };

      const newState = clientsReducer(state, setActiveClientFailure({ error: 'Set active failed' }));

      expect(newState.error).toBe('Set active failed');
    });
  });

  describe('clearActiveClient', () => {
    it('should clear activeClientId', () => {
      const state: ClientsState = {
        ...initialClientsState,
        activeClientId: 'client-1',
        error: 'Previous error',
      };

      const newState = clientsReducer(state, clearActiveClient());

      expect(newState.activeClientId).toBeNull();
      expect(newState.error).toBeNull();
    });

    it('should handle clearing when no client is active', () => {
      const state: ClientsState = {
        ...initialClientsState,
        activeClientId: null,
      };

      const newState = clientsReducer(state, clearActiveClient());

      expect(newState.activeClientId).toBeNull();
    });

    it('should not affect other state properties', () => {
      const state: ClientsState = {
        ...initialClientsState,
        entities: [mockClient, mockClient2],
        selectedClient: mockClient,
        activeClientId: 'client-1',
      };

      const newState = clientsReducer(state, clearActiveClient());

      expect(newState.activeClientId).toBeNull();
      expect(newState.entities).toEqual([mockClient, mockClient2]);
      expect(newState.selectedClient).toEqual(mockClient);
    });
  });
});
