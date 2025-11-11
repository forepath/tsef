import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import type { ClientResponseDto, CreateClientDto, ListClientsParams, UpdateClientDto } from './clients.types';
import { createClient, deleteClient, loadClient, loadClients, setActiveClient, updateClient } from './clients.actions';
import {
  selectActiveClient,
  selectActiveClientId,
  selectClientById,
  selectClientCreating,
  selectClientDeleting,
  selectClientLoading,
  selectClientUpdating,
  selectClients,
  selectClientsCount,
  selectClientsError,
  selectClientsLoading,
  selectClientsLoadingAny,
  selectHasClients,
  selectSelectedClient,
} from './clients.selectors';

/**
 * Facade for clients state management.
 * Provides a clean API for components to interact with clients state
 * without directly accessing the NgRx store.
 */
@Injectable({
  providedIn: 'root',
})
export class ClientsFacade {
  private readonly store = inject(Store);

  // State observables
  readonly clients$: Observable<ClientResponseDto[]> = this.store.select(selectClients);
  readonly selectedClient$: Observable<ClientResponseDto | null> = this.store.select(selectSelectedClient);
  readonly activeClientId$: Observable<string | null> = this.store.select(selectActiveClientId);
  readonly activeClient$: Observable<ClientResponseDto | null> = this.store.select(selectActiveClient);

  // Loading state observables
  readonly loading$: Observable<boolean> = this.store.select(selectClientsLoading);
  readonly loadingClient$: Observable<boolean> = this.store.select(selectClientLoading);
  readonly creating$: Observable<boolean> = this.store.select(selectClientCreating);
  readonly updating$: Observable<boolean> = this.store.select(selectClientUpdating);
  readonly deleting$: Observable<boolean> = this.store.select(selectClientDeleting);
  readonly loadingAny$: Observable<boolean> = this.store.select(selectClientsLoadingAny);

  // Error observable
  readonly error$: Observable<string | null> = this.store.select(selectClientsError);

  // Derived state observables
  readonly clientsCount$: Observable<number> = this.store.select(selectClientsCount);
  readonly hasClients$: Observable<boolean> = this.store.select(selectHasClients);

  /**
   * Load all clients with optional pagination.
   */
  loadClients(params?: ListClientsParams): void {
    this.store.dispatch(loadClients({ params }));
  }

  /**
   * Load a specific client by ID.
   */
  loadClient(id: string): void {
    this.store.dispatch(loadClient({ id }));
  }

  /**
   * Create a new client.
   */
  createClient(client: CreateClientDto): void {
    this.store.dispatch(createClient({ client }));
  }

  /**
   * Update an existing client.
   */
  updateClient(id: string, client: UpdateClientDto): void {
    this.store.dispatch(updateClient({ id, client }));
  }

  /**
   * Delete a client.
   */
  deleteClient(id: string): void {
    this.store.dispatch(deleteClient({ id }));
  }

  /**
   * Set the active client by ID.
   */
  setActiveClient(id: string): void {
    this.store.dispatch(setActiveClient({ id }));
  }

  /**
   * Get a client by ID as an observable.
   * @param id - The client ID
   * @returns Observable of the client or null if not found
   */
  getClientById$(id: string): Observable<ClientResponseDto | null> {
    return this.store.select(selectClientById(id));
  }
}
