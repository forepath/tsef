import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';

import {
  adminCancelSubscription,
  adminInstantCancelSubscription,
  adminResumeSubscription,
  adminWithdrawSubscription,
  loadAdminSubscriptions,
} from './admin-subscriptions.actions';
import {
  selectAdminSubscriptions,
  selectAdminSubscriptionsCanceling,
  selectAdminSubscriptionsError,
  selectAdminSubscriptionsInstantCanceling,
  selectAdminSubscriptionsLoading,
  selectAdminSubscriptionsResuming,
  selectAdminSubscriptionsWithdrawing,
} from './admin-subscriptions.selectors';

@Injectable()
export class AdminSubscriptionsFacade {
  private readonly store = inject(Store);

  readonly subscriptions$ = this.store.select(selectAdminSubscriptions);
  readonly loading$ = this.store.select(selectAdminSubscriptionsLoading);
  readonly canceling$ = this.store.select(selectAdminSubscriptionsCanceling);
  readonly withdrawing$ = this.store.select(selectAdminSubscriptionsWithdrawing);
  readonly instantCanceling$ = this.store.select(selectAdminSubscriptionsInstantCanceling);
  readonly resuming$ = this.store.select(selectAdminSubscriptionsResuming);
  readonly error$ = this.store.select(selectAdminSubscriptionsError);

  loadSubscriptions(params?: { search?: string; userId?: string }): void {
    this.store.dispatch(loadAdminSubscriptions(params ?? {}));
  }

  cancelSubscription(id: string): void {
    this.store.dispatch(adminCancelSubscription({ id }));
  }

  withdrawSubscription(id: string): void {
    this.store.dispatch(adminWithdrawSubscription({ id }));
  }

  instantCancelSubscription(id: string): void {
    this.store.dispatch(adminInstantCancelSubscription({ id }));
  }

  resumeSubscription(id: string): void {
    this.store.dispatch(adminResumeSubscription({ id }));
  }
}
