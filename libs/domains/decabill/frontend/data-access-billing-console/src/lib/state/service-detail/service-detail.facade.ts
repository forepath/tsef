import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

import type {
  MeterHistoryFilters,
  SubscriptionItemDetailResponse,
  SubscriptionMeterHistory,
} from '../../types/billing.types';

import {
  applyFilters,
  clearServiceDetail,
  enterServiceDetail,
  resetFilters,
  updateDisplayName,
} from './service-detail.actions';
import {
  selectServiceDetail,
  selectServiceDetailDisplayLabel,
  selectServiceDetailError,
  selectServiceDetailFilters,
  selectServiceDetailHistory,
  selectServiceDetailItemId,
  selectServiceDetailLoadingAny,
  selectServiceDetailLoadingDetail,
  selectServiceDetailLoadingHistory,
  selectServiceDetailMetersFromSocket,
  selectServiceDetailRenaming,
  selectServiceDetailSubscriptionId,
} from './service-detail.selectors';

@Injectable({
  providedIn: 'root',
})
export class ServiceDetailFacade {
  private readonly store = inject(Store);

  readonly subscriptionId$ = this.store.select(selectServiceDetailSubscriptionId);
  readonly itemId$ = this.store.select(selectServiceDetailItemId);
  readonly detail$ = this.store.select(selectServiceDetail);
  readonly history$ = this.store.select(selectServiceDetailHistory);
  readonly filters$ = this.store.select(selectServiceDetailFilters);
  readonly loadingDetail$ = this.store.select(selectServiceDetailLoadingDetail);
  readonly loadingHistory$ = this.store.select(selectServiceDetailLoadingHistory);
  readonly renaming$ = this.store.select(selectServiceDetailRenaming);
  readonly error$ = this.store.select(selectServiceDetailError);
  readonly metersFromSocket$ = this.store.select(selectServiceDetailMetersFromSocket);
  readonly loadingAny$ = this.store.select(selectServiceDetailLoadingAny);
  readonly displayLabel$ = this.store.select(selectServiceDetailDisplayLabel);

  getDetail$(): Observable<SubscriptionItemDetailResponse | null> {
    return this.detail$;
  }

  getHistory$(): Observable<SubscriptionMeterHistory | null> {
    return this.history$;
  }

  enter(subscriptionId: string, itemId: string, adminMode = false): void {
    this.store.dispatch(enterServiceDetail({ subscriptionId, itemId, adminMode }));
  }

  applyHistoryFilters(filters: MeterHistoryFilters, adminMode = false): void {
    this.store.dispatch(applyFilters({ filters, adminMode }));
  }

  resetHistoryFilters(adminMode = false): void {
    this.store.dispatch(resetFilters({ adminMode }));
  }

  renameDisplayName(subscriptionId: string, itemId: string, displayName: string | null, adminMode = false): void {
    this.store.dispatch(updateDisplayName({ subscriptionId, itemId, displayName, adminMode }));
  }

  clear(): void {
    this.store.dispatch(clearServiceDetail());
  }
}
