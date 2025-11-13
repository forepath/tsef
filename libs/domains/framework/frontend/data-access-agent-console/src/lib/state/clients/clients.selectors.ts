import { createFeatureSelector, createSelector } from '@ngrx/store';
import type { ClientsState } from './clients.reducer';

export const selectClientsState = createFeatureSelector<ClientsState>('clients');

// Entity selectors
export const selectClients = createSelector(selectClientsState, (state) => state.entities);

export const selectSelectedClient = createSelector(selectClientsState, (state) => state.selectedClient);

export const selectActiveClientId = createSelector(selectClientsState, (state) => state.activeClientId);

export const selectActiveClient = createSelector(selectClients, selectActiveClientId, (clients, activeClientId) =>
  activeClientId ? (clients.find((c) => c.id === activeClientId) ?? null) : null,
);

// Loading state selectors
export const selectClientsLoading = createSelector(selectClientsState, (state) => state.loading);

export const selectClientLoading = createSelector(selectClientsState, (state) => state.loadingClient);

export const selectClientCreating = createSelector(selectClientsState, (state) => state.creating);

export const selectClientUpdating = createSelector(selectClientsState, (state) => state.updating);

export const selectClientDeleting = createSelector(selectClientsState, (state) => state.deleting);

// Combined loading selector (true if any operation is loading)
export const selectClientsLoadingAny = createSelector(
  selectClientsLoading,
  selectClientLoading,
  selectClientCreating,
  selectClientUpdating,
  selectClientDeleting,
  (loading, loadingClient, creating, updating, deleting) =>
    loading || loadingClient || creating || updating || deleting,
);

// Error selector
export const selectClientsError = createSelector(selectClientsState, (state) => state.error);

// Derived selectors
export const selectClientsCount = createSelector(selectClients, (clients) => clients.length);

export const selectClientById = (id: string) =>
  createSelector(selectClients, (clients) => clients.find((c) => c.id === id) ?? null);

export const selectHasClients = createSelector(selectClients, (clients) => clients.length > 0);
