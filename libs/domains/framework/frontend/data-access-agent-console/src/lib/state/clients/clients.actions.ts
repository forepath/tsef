import { createAction, props } from '@ngrx/store';
import type {
  ClientResponseDto,
  CreateClientDto,
  CreateClientResponseDto,
  ListClientsParams,
  UpdateClientDto,
} from './clients.types';

// List Clients Actions
export const loadClients = createAction('[Clients] Load Clients', props<{ params?: ListClientsParams }>());

export const loadClientsSuccess = createAction(
  '[Clients] Load Clients Success',
  props<{ clients: ClientResponseDto[] }>(),
);

export const loadClientsFailure = createAction('[Clients] Load Clients Failure', props<{ error: string }>());

export const loadClientsBatch = createAction(
  '[Clients] Load Clients Batch',
  props<{ offset: number; accumulatedClients: ClientResponseDto[] }>(),
);

// Get Client by ID Actions
export const loadClient = createAction('[Clients] Load Client', props<{ id: string }>());

export const loadClientSuccess = createAction('[Clients] Load Client Success', props<{ client: ClientResponseDto }>());

export const loadClientFailure = createAction('[Clients] Load Client Failure', props<{ error: string }>());

// Create Client Actions
export const createClient = createAction('[Clients] Create Client', props<{ client: CreateClientDto }>());

export const createClientSuccess = createAction(
  '[Clients] Create Client Success',
  props<{ client: CreateClientResponseDto }>(),
);

export const createClientFailure = createAction('[Clients] Create Client Failure', props<{ error: string }>());

// Update Client Actions
export const updateClient = createAction('[Clients] Update Client', props<{ id: string; client: UpdateClientDto }>());

export const updateClientSuccess = createAction(
  '[Clients] Update Client Success',
  props<{ client: ClientResponseDto }>(),
);

export const updateClientFailure = createAction('[Clients] Update Client Failure', props<{ error: string }>());

// Delete Client Actions
export const deleteClient = createAction('[Clients] Delete Client', props<{ id: string }>());

export const deleteClientSuccess = createAction('[Clients] Delete Client Success', props<{ id: string }>());

export const deleteClientFailure = createAction('[Clients] Delete Client Failure', props<{ error: string }>());

// Set Active Client Actions
export const setActiveClient = createAction('[Clients] Set Active Client', props<{ id: string }>());

export const setActiveClientSuccess = createAction('[Clients] Set Active Client Success', props<{ id: string }>());

export const setActiveClientFailure = createAction('[Clients] Set Active Client Failure', props<{ error: string }>());

// Clear Active Client Actions
export const clearActiveClient = createAction('[Clients] Clear Active Client');
