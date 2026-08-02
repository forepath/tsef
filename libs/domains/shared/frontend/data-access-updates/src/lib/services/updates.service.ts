import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { UPDATES_ADMIN_ENVIRONMENT } from '../tokens/updates-admin-environment';
import type { UpdateCheckTriggerResult, UpdatesFullState, UpdatesStatusSummary } from '../types/updates.types';

@Injectable({
  providedIn: 'root',
})
export class UpdatesService {
  private readonly http = inject(HttpClient);
  private readonly environment = inject(UPDATES_ADMIN_ENVIRONMENT);

  private get baseUrl(): string {
    return `${this.environment.apiUrl}/${this.environment.updatesBasePath}`;
  }

  getFullState(): Observable<UpdatesFullState> {
    return this.http.get<UpdatesFullState>(this.baseUrl);
  }

  getStatus(): Observable<UpdatesStatusSummary> {
    return this.http.get<UpdatesStatusSummary>(`${this.baseUrl}/status`);
  }

  triggerCheck(): Observable<UpdateCheckTriggerResult> {
    return this.http.post<UpdateCheckTriggerResult>(`${this.baseUrl}/check`, {});
  }
}
