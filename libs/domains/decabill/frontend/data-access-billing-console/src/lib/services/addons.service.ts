import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Environment } from '@forepath/shared/frontend/util-configuration';
import { ENVIRONMENT } from '@forepath/shared/frontend/util-configuration';
import { Observable } from 'rxjs';

import type { AddonResponse, CreateAddonDto, ListParams, UpdateAddonDto } from '../types/billing.types';

@Injectable({
  providedIn: 'root',
})
export class AddonsService {
  private readonly http = inject(HttpClient);
  private readonly environment = inject<Environment>(ENVIRONMENT);

  private get apiUrl(): string {
    return this.environment.billing.restApiUrl;
  }

  listAddons(params?: ListParams): Observable<AddonResponse[]> {
    let httpParams = new HttpParams();

    if (params?.limit !== undefined) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }

    if (params?.offset !== undefined) {
      httpParams = httpParams.set('offset', params.offset.toString());
    }

    return this.http.get<AddonResponse[]>(`${this.apiUrl}/addons`, { params: httpParams });
  }

  getAddon(id: string): Observable<AddonResponse> {
    return this.http.get<AddonResponse>(`${this.apiUrl}/addons/${id}`);
  }

  createAddon(dto: CreateAddonDto): Observable<AddonResponse> {
    return this.http.post<AddonResponse>(`${this.apiUrl}/addons`, dto);
  }

  updateAddon(id: string, dto: UpdateAddonDto): Observable<AddonResponse> {
    return this.http.post<AddonResponse>(`${this.apiUrl}/addons/${id}`, dto);
  }

  deleteAddon(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/addons/${id}`);
  }
}
