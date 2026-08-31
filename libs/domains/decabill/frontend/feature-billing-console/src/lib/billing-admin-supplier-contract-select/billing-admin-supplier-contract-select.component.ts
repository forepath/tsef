import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, input, model, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  AdminSupplierProfilesService,
  type SupplierContractResponse,
} from '@forepath/decabill/frontend/data-access-billing-console';
import { catchError, debounceTime, distinctUntilChanged, of, skip, switchMap, tap } from 'rxjs';

@Component({
  selector: 'framework-billing-admin-supplier-contract-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './billing-admin-supplier-contract-select.component.html',
  styleUrls: ['../billing-admin-user-select/billing-admin-user-select.component.scss'],
})
export class BillingAdminSupplierContractSelectComponent {
  readonly contracts = input<SupplierContractResponse[]>([]);
  readonly supplierId = input<string | undefined>(undefined);
  readonly selectedContractNumber = model<string>('');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly inputId = input('billingAdminSupplierContractSelect');
  readonly placeholder = input(
    $localize`:@@featureBillingAdminSupplierContractSelect-placeholder:Search contract number`,
  );
  readonly loadingPlaceholder = $localize`:@@featureBillingAdminSupplierContractSelect-loadingPlaceholder:Select a supplier first`;
  readonly showSuggestionsOnFocus = input(true);
  readonly suggestionLimit = input(20);

  private readonly profilesService = inject(AdminSupplierProfilesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchQuery = signal('');
  readonly searchQuery$ = toObservable(this.searchQuery);
  readonly suggestionsOpen = signal(false);
  readonly searchResults = signal<SupplierContractResponse[]>([]);
  readonly searchLoading = signal(false);
  /** Keeps the picked contract visible after search results are cleared. */
  private readonly selectedContractCache = signal<SupplierContractResponse | null>(null);

  readonly filteredContracts = computed(() => this.searchResults());

  readonly selectedContract = computed(() => {
    const selectedNumber = this.selectedContractNumber();

    if (!selectedNumber) {
      return null;
    }

    return (
      this.contracts().find((contract) => contract.contractNumber === selectedNumber) ??
      this.searchResults().find((contract) => contract.contractNumber === selectedNumber) ??
      (this.selectedContractCache()?.contractNumber === selectedNumber ? this.selectedContractCache() : null)
    );
  });

  readonly isInputDisabled = computed(() => this.disabled() || this.loading() || !this.supplierId()?.trim());

  constructor() {
    this.searchQuery$
      .pipe(
        skip(1),
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => this.searchLoading.set(true)),
        switchMap((query) => {
          const term = query.trim();
          const supplierId = this.supplierId()?.trim();

          if (!term || !supplierId) {
            return of([] as SupplierContractResponse[]);
          }

          return this.profilesService
            .listContracts(supplierId, term)
            .pipe(catchError(() => of([] as SupplierContractResponse[])));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((contracts) => {
        this.searchResults.set(contracts.slice(0, this.suggestionLimit()));
        this.searchLoading.set(false);

        if (this.searchQuery().trim().length > 0 || this.showSuggestionsOnFocus()) {
          this.suggestionsOpen.set(true);
        }
      });
  }

  reset(): void {
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.suggestionsOpen.set(false);
  }

  onSearchChange(value: string): void {
    this.searchQuery.set(value);

    if (value.trim().length > 0 || this.showSuggestionsOnFocus()) {
      this.suggestionsOpen.set(true);
    }
  }

  onSearchFocus(): void {
    const hasQuery = this.searchQuery().trim().length > 0;

    if ((hasQuery || this.showSuggestionsOnFocus()) && this.filteredContracts().length > 0) {
      this.suggestionsOpen.set(true);
    }
  }

  onSearchBlur(): void {
    setTimeout(() => this.suggestionsOpen.set(false), 180);
  }

  pickContract(contract: SupplierContractResponse, event: Event): void {
    event.preventDefault();
    this.selectedContractCache.set(contract);
    this.selectedContractNumber.set(contract.contractNumber);
    this.reset();
  }

  clearSelection(): void {
    this.selectedContractCache.set(null);
    this.selectedContractNumber.set('');
    this.reset();
  }
}
