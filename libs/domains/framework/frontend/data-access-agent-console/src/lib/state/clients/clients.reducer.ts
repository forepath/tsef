import { createReducer, on } from '@ngrx/store';
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
  setActiveClientFailure,
  setActiveClientSuccess,
  updateClient,
  updateClientFailure,
  updateClientSuccess,
} from './clients.actions';
import type { ClientResponseDto } from './clients.types';

export interface ClientsState {
  entities: ClientResponseDto[];
  selectedClient: ClientResponseDto | null;
  activeClientId: string | null;
  loading: boolean;
  loadingClient: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  error: string | null;
}

export const initialClientsState: ClientsState = {
  entities: [],
  selectedClient: null,
  activeClientId: null,
  loading: false,
  loadingClient: false,
  creating: false,
  updating: false,
  deleting: false,
  error: null,
};

export const clientsReducer = createReducer(
  initialClientsState,
  // Load Clients
  on(loadClients, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(loadClientsSuccess, (state, { clients }) => ({
    ...state,
    entities: clients,
    loading: false,
    error: null,
  })),
  on(loadClientsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  // Load Client by ID
  on(loadClient, (state) => ({
    ...state,
    loadingClient: true,
    error: null,
  })),
  on(loadClientSuccess, (state, { client }) => {
    const existingIndex = state.entities.findIndex((c) => c.id === client.id);
    const entities =
      existingIndex >= 0 ? state.entities.map((c) => (c.id === client.id ? client : c)) : [...state.entities, client];
    return {
      ...state,
      selectedClient: client,
      entities,
      loadingClient: false,
      error: null,
    };
  }),
  on(loadClientFailure, (state, { error }) => ({
    ...state,
    loadingClient: false,
    error,
  })),
  // Create Client
  on(createClient, (state) => ({
    ...state,
    creating: true,
    error: null,
  })),
  on(createClientSuccess, (state, { client }) => {
    // Strip apiKey from CreateClientResponseDto to store as ClientResponseDto
    const { apiKey, ...clientResponse } = client;
    return {
      ...state,
      entities: [...state.entities, clientResponse],
      selectedClient: clientResponse,
      creating: false,
      error: null,
    };
  }),
  on(createClientFailure, (state, { error }) => ({
    ...state,
    creating: false,
    error,
  })),
  // Update Client
  on(updateClient, (state) => ({
    ...state,
    updating: true,
    error: null,
  })),
  on(updateClientSuccess, (state, { client }) => ({
    ...state,
    entities: state.entities.map((c) => (c.id === client.id ? client : c)),
    selectedClient: state.selectedClient?.id === client.id ? client : state.selectedClient,
    updating: false,
    error: null,
  })),
  on(updateClientFailure, (state, { error }) => ({
    ...state,
    updating: false,
    error,
  })),
  // Delete Client
  on(deleteClient, (state) => ({
    ...state,
    deleting: true,
    error: null,
  })),
  on(deleteClientSuccess, (state, { id }) => ({
    ...state,
    entities: state.entities.filter((c) => c.id !== id),
    selectedClient: state.selectedClient?.id === id ? null : state.selectedClient,
    activeClientId: state.activeClientId === id ? null : state.activeClientId,
    deleting: false,
    error: null,
  })),
  on(deleteClientFailure, (state, { error }) => ({
    ...state,
    deleting: false,
    error,
  })),
  // Set Active Client
  on(setActiveClient, (state) => ({
    ...state,
    error: null,
  })),
  on(setActiveClientSuccess, (state, { id }) => ({
    ...state,
    activeClientId: id,
    error: null,
  })),
  on(setActiveClientFailure, (state, { error }) => ({
    ...state,
    error,
  })),
);
