import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, input, model, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  AdminBillingService,
  type SubscriptionResponse,
} from '@forepath/decabill/frontend/data-access-billing-console';
import { catchError, debounceTime, distinctUntilChanged, map, of, skip, switchMap, tap } from 'rxjs';

import { getSubscriptionStatusLabel } from '../billing-status-labels';
import { getBillingAdminSubscriptionPrimaryLabel } from '../billing-subscription-select';

@Component({
  selector: 'framework-billing-admin-subscription-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './billing-admin-subscription-select.component.html',
  styleUrls: ['../billing-admin-user-select/billing-admin-user-select.component.scss'],
})
export class BillingAdminSubscriptionSelectComponent {
  /** Optional cache for resolving the selected subscription label. */
  readonly subscriptions = input<SubscriptionResponse[]>([]);
  readonly userId = input<string | undefined>(undefined);
  readonly selectedSubscriptionId = model<string>('');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly inputId = input('billingAdminSubscriptionSelect');
  readonly placeholder = input(
    $localize`:@@featureBillingAdminSubscriptionSelect-placeholder:Search by number, plan, or ID`,
  );
  readonly loadingPlaceholder = $localize`:@@featureBillingAdminSubscriptionSelect-loadingPlaceholder:Loading subscriptions...`;
  readonly showSuggestionsOnFocus = input(true);
  readonly suggestionLimit = input(20);

  private readonly adminBillingService = inject(AdminBillingService);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchQuery = signal('');
  readonly searchQuery$ = toObservable(this.searchQuery);
  readonly suggestionsOpen = signal(false);
  readonly searchResults = signal<SubscriptionResponse[]>([]);
  readonly searchLoading = signal(false);

  readonly filteredSubscriptions = computed(() => this.searchResults());

  readonly selectedSubscription = computed(
    () =>
      this.subscriptions().find((subscription) => subscription.id === this.selectedSubscriptionId()) ??
      this.searchResults().find((subscription) => subscription.id === this.selectedSubscriptionId()) ??
      null,
  );

  readonly isInputDisabled = computed(() => this.disabled() || this.loading() || this.searchLoading());

  constructor() {
    this.searchQuery$
      .pipe(
        skip(1),
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => this.searchLoading.set(true)),
        switchMap((query) => {
          const term = query.trim();
          const userId = this.userId()?.trim();

          if (!term) {
            return of([] as SubscriptionResponse[]);
          }

          return this.adminBillingService
            .listSubscriptions({
              search: term,
              limit: this.suggestionLimit(),
              offset: 0,
              userId: userId || undefined,
            })
            .pipe(
              map((response) => response.items),
              catchError(() => of([] as SubscriptionResponse[])),
            );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((subscriptions) => {
        this.searchResults.set(subscriptions);
        this.searchLoading.set(false);
      });
  }

  reset(): void {
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.suggestionsOpen.set(false);
  }

  subscriptionPrimaryLabel(subscription: SubscriptionResponse): string {
    return getBillingAdminSubscriptionPrimaryLabel(subscription);
  }

  subscriptionStatusLabel(status: string | null | undefined): string {
    return getSubscriptionStatusLabel(status);
  }

  onSearchChange(value: string): void {
    this.searchQuery.set(value);

    if (value.trim().length > 0 || this.showSuggestionsOnFocus()) {
      this.suggestionsOpen.set(true);
    }
  }

  onSearchFocus(): void {
    const hasQuery = this.searchQuery().trim().length > 0;

    if ((hasQuery || this.showSuggestionsOnFocus()) && this.filteredSubscriptions().length > 0) {
      this.suggestionsOpen.set(true);
    }
  }

  onSearchBlur(): void {
    setTimeout(() => this.suggestionsOpen.set(false), 180);
  }

  pickSubscription(subscription: SubscriptionResponse, event: Event): void {
    event.preventDefault();
    this.selectedSubscriptionId.set(subscription.id);
    this.reset();
  }

  clearSelection(): void {
    this.selectedSubscriptionId.set('');
    this.reset();
  }
}
