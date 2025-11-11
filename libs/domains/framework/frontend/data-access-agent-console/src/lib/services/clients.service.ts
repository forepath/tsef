import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Environment } from '@forepath/framework/frontend/util-configuration';
import { ENVIRONMENT } from '@forepath/framework/frontend/util-configuration';
import { Observable } from 'rxjs';
import type {
  ClientResponseDto,
  CreateClientDto,
  CreateClientResponseDto,
  ListClientsParams,
  UpdateClientDto,
} from '../state/clients/clients.types';

@Injectable({
  providedIn: 'root',
})
export class ClientsService {
  private readonly http = inject(HttpClient);
  private readonly environment = inject<Environment>(ENVIRONMENT);

  /**
   * Get the base URL for the API.
   */
  private get apiUrl(): string {
    return this.environment.controller?.restApiUrl || 'http://localhost:3100/api';
  }

  /**
   * List all clients with optional pagination.
   */
  listClients(params?: ListClientsParams): Observable<ClientResponseDto[]> {
    let httpParams = new HttpParams();
    if (params?.limit !== undefined) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }
    if (params?.offset !== undefined) {
      httpParams = httpParams.set('offset', params.offset.toString());
    }

    return this.http.get<ClientResponseDto[]>(`${this.apiUrl}/clients`, {
      params: httpParams,
    });
  }

  /**
   * Get a client by ID.
   */
  getClient(id: string): Observable<ClientResponseDto> {
    return this.http.get<ClientResponseDto>(`${this.apiUrl}/clients/${id}`);
  }

  /**
   * Create a new client.
   */
  createClient(client: CreateClientDto): Observable<CreateClientResponseDto> {
    return this.http.post<CreateClientResponseDto>(`${this.apiUrl}/clients`, client);
  }

  /**
   * Update an existing client.
   */
  updateClient(id: string, client: UpdateClientDto): Observable<ClientResponseDto> {
    return this.http.post<ClientResponseDto>(`${this.apiUrl}/clients/${id}`, client);
  }

  /**
   * Delete a client.
   */
  deleteClient(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/clients/${id}`);
  }
}
