import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

import type {
  ConfigChangeAmounts,
  ConfigChangeDisclaimer,
  ConfigChangeDiscount,
  ConfigChangeEligibility,
  ConfigChangeErrorCode,
  ConfigChangePreviewResponse,
  ConfigChangeRequest,
  ConfigChangeResponse,
} from '../../types/config-change.types';

import {
  clearConfigChangePreview,
  loadConfigChangeEligibility,
  previewConfigChange,
  resetConfigChange,
  submitConfigChange,
} from './subscription-config-change.actions';
import {
  selectCanRequestConfigChange,
  selectConfigChangeAmounts,
  selectConfigChangeBusy,
  selectConfigChangeDisclaimer,
  selectConfigChangeDiscounts,
  selectConfigChangeEligibility,
  selectConfigChangeEligibilityError,
  selectConfigChangeEligibilityLoading,
  selectConfigChangePreview,
  selectConfigChangePreviewError,
  selectConfigChangePreviewErrorCode,
  selectConfigChangePreviewLoading,
  selectConfigChangeResult,
  selectConfigChangeSubmitError,
  selectConfigChangeSubmitErrorCode,
  selectConfigChangeSubmitting,
} from './subscription-config-change.selectors';

@Injectable({
  providedIn: 'root',
})
export class SubscriptionConfigChangeFacade {
  private readonly store = inject(Store);

  getEligibility$(): Observable<ConfigChangeEligibility | null> {
    return this.store.select(selectConfigChangeEligibility);
  }

  getEligibilityLoading$(): Observable<boolean> {
    return this.store.select(selectConfigChangeEligibilityLoading);
  }

  getEligibilityError$(): Observable<string | null> {
    return this.store.select(selectConfigChangeEligibilityError);
  }

  canRequestChange$(): Observable<boolean> {
    return this.store.select(selectCanRequestConfigChange);
  }

  getPreview$(): Observable<ConfigChangePreviewResponse | null> {
    return this.store.select(selectConfigChangePreview);
  }

  getPreviewLoading$(): Observable<boolean> {
    return this.store.select(selectConfigChangePreviewLoading);
  }

  getPreviewError$(): Observable<string | null> {
    return this.store.select(selectConfigChangePreviewError);
  }

  getPreviewErrorCode$(): Observable<ConfigChangeErrorCode | null> {
    return this.store.select(selectConfigChangePreviewErrorCode);
  }

  getAmounts$(): Observable<ConfigChangeAmounts | null> {
    return this.store.select(selectConfigChangeAmounts);
  }

  getDisclaimer$(): Observable<ConfigChangeDisclaimer | null> {
    return this.store.select(selectConfigChangeDisclaimer);
  }

  getDiscounts$(): Observable<ConfigChangeDiscount[]> {
    return this.store.select(selectConfigChangeDiscounts);
  }

  getSubmitting$(): Observable<boolean> {
    return this.store.select(selectConfigChangeSubmitting);
  }

  getSubmitError$(): Observable<string | null> {
    return this.store.select(selectConfigChangeSubmitError);
  }

  getSubmitErrorCode$(): Observable<ConfigChangeErrorCode | null> {
    return this.store.select(selectConfigChangeSubmitErrorCode);
  }

  getResult$(): Observable<ConfigChangeResponse | null> {
    return this.store.select(selectConfigChangeResult);
  }

  isBusy$(): Observable<boolean> {
    return this.store.select(selectConfigChangeBusy);
  }

  loadEligibility(subscriptionId: string): void {
    this.store.dispatch(loadConfigChangeEligibility({ subscriptionId }));
  }

  preview(subscriptionId: string, request: ConfigChangeRequest): void {
    this.store.dispatch(previewConfigChange({ subscriptionId, request }));
  }

  clearPreview(): void {
    this.store.dispatch(clearConfigChangePreview());
  }

  submit(subscriptionId: string, request: ConfigChangeRequest): void {
    this.store.dispatch(submitConfigChange({ subscriptionId, request }));
  }

  reset(): void {
    this.store.dispatch(resetConfigChange());
  }
}
