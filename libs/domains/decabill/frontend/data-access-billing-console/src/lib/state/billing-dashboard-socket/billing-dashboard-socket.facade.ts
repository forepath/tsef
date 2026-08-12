import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

import {
  connectBillingDashboardSocket,
  disconnectBillingDashboardSocket,
  subscribeBillingSubscriptionMeters,
  unsubscribeBillingSubscriptionMeters,
} from './billing-dashboard-socket.actions';
import {
  selectBillingDashboardSocketConnected,
  selectBillingDashboardSocketError,
  selectBillingDashboardStreamPending,
} from './billing-dashboard-socket.selectors';

@Injectable({
  providedIn: 'root',
})
export class BillingDashboardSocketFacade {
  private readonly store = inject(Store);

  connect(): void {
    this.store.dispatch(connectBillingDashboardSocket());
  }

  disconnect(): void {
    this.store.dispatch(disconnectBillingDashboardSocket());
  }

  subscribeSubscriptionMeters(subscriptionId: string): void {
    this.store.dispatch(subscribeBillingSubscriptionMeters({ subscriptionId }));
  }

  unsubscribeSubscriptionMeters(subscriptionId: string): void {
    this.store.dispatch(unsubscribeBillingSubscriptionMeters({ subscriptionId }));
  }

  getStreamPending$(): Observable<boolean> {
    return this.store.select(selectBillingDashboardStreamPending);
  }

  getConnected$(): Observable<boolean> {
    return this.store.select(selectBillingDashboardSocketConnected);
  }

  getError$(): Observable<string | null> {
    return this.store.select(selectBillingDashboardSocketError);
  }
}
