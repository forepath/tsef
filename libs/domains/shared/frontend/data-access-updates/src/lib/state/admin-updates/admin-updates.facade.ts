import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';

import {
  clearAdminUpdatesError,
  loadAdminUpdatesFull,
  loadAdminUpdatesStatus,
  triggerAdminUpdateCheck,
} from './admin-updates.actions';
import {
  selectAdminUpdatesChecking,
  selectAdminUpdatesError,
  selectAdminUpdatesFullLoading,
  selectAdminUpdatesFullState,
  selectAdminUpdatesHasAttention,
  selectAdminUpdatesInstances,
  selectAdminUpdatesScopedChangelog,
  selectAdminUpdatesStatus,
  selectAdminUpdatesStatusLoading,
} from './admin-updates.selectors';

@Injectable({
  providedIn: 'root',
})
export class AdminUpdatesFacade {
  private readonly store = inject(Store);

  readonly status$ = this.store.select(selectAdminUpdatesStatus);
  readonly fullState$ = this.store.select(selectAdminUpdatesFullState);
  readonly statusLoading$ = this.store.select(selectAdminUpdatesStatusLoading);
  readonly fullLoading$ = this.store.select(selectAdminUpdatesFullLoading);
  readonly checking$ = this.store.select(selectAdminUpdatesChecking);
  readonly error$ = this.store.select(selectAdminUpdatesError);
  readonly hasAttention$ = this.store.select(selectAdminUpdatesHasAttention);
  readonly instances$ = this.store.select(selectAdminUpdatesInstances);
  readonly scopedChangelog$ = this.store.select(selectAdminUpdatesScopedChangelog);

  loadStatus(): void {
    this.store.dispatch(loadAdminUpdatesStatus());
  }

  loadFull(): void {
    this.store.dispatch(loadAdminUpdatesFull());
  }

  triggerCheck(): void {
    this.store.dispatch(triggerAdminUpdateCheck());
  }

  clearError(): void {
    this.store.dispatch(clearAdminUpdatesError());
  }
}
