import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

import type { AddonResponse, CreateAddonDto, ListParams, UpdateAddonDto } from '../../types/billing.types';

import { clearSelectedAddon, createAddon, deleteAddon, loadAddon, loadAddons, updateAddon } from './addons.actions';
import {
  selectActiveAddons,
  selectAddonLoading,
  selectAddonsCreating,
  selectAddonsDeleting,
  selectAddonsEntities,
  selectAddonsError,
  selectAddonsLoading,
  selectAddonsLoadingAny,
  selectAddonsUpdating,
  selectSelectedAddon,
} from './addons.selectors';

@Injectable({
  providedIn: 'root',
})
export class AddonsFacade {
  private readonly store = inject(Store);

  getAddons$(): Observable<AddonResponse[]> {
    return this.store.select(selectAddonsEntities);
  }

  getActiveAddons$(): Observable<AddonResponse[]> {
    return this.store.select(selectActiveAddons);
  }

  getSelectedAddon$(): Observable<AddonResponse | null> {
    return this.store.select(selectSelectedAddon);
  }

  getAddonsLoading$(): Observable<boolean> {
    return this.store.select(selectAddonsLoading);
  }

  getAddonLoading$(): Observable<boolean> {
    return this.store.select(selectAddonLoading);
  }

  getAddonsCreating$(): Observable<boolean> {
    return this.store.select(selectAddonsCreating);
  }

  getAddonsUpdating$(): Observable<boolean> {
    return this.store.select(selectAddonsUpdating);
  }

  getAddonsDeleting$(): Observable<boolean> {
    return this.store.select(selectAddonsDeleting);
  }

  getAddonsLoadingAny$(): Observable<boolean> {
    return this.store.select(selectAddonsLoadingAny);
  }

  getAddonsError$(): Observable<string | null> {
    return this.store.select(selectAddonsError);
  }

  loadAddons(params?: ListParams): void {
    this.store.dispatch(loadAddons({ params }));
  }

  loadAddon(id: string): void {
    this.store.dispatch(loadAddon({ id }));
  }

  createAddon(addon: CreateAddonDto): void {
    this.store.dispatch(createAddon({ addon }));
  }

  updateAddon(id: string, addon: UpdateAddonDto): void {
    this.store.dispatch(updateAddon({ id, addon }));
  }

  deleteAddon(id: string): void {
    this.store.dispatch(deleteAddon({ id }));
  }

  clearSelectedAddon(): void {
    this.store.dispatch(clearSelectedAddon());
  }
}
