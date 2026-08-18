import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { take } from 'rxjs';

import type {
  CreateManualInvoiceDto,
  IssueManualInvoiceDto,
  MarkInvoicePaymentStatusDto,
  UpdateManualInvoiceDto,
} from '../../types/billing.types';

import {
  adminInvoiceManagerMarkPaid,
  adminInvoiceManagerMarkUnpaid,
  adminInvoiceManagerVoid,
  createManualInvoice,
  deleteManualInvoice,
  issueManualInvoice,
  loadAdminInvoiceManager,
  loadMoreAdminInvoiceManager,
  updateManualInvoice,
} from './admin-invoice-manager.actions';
import {
  selectAdminInvoiceManagerActionLoading,
  selectAdminInvoiceManagerAppendError,
  selectAdminInvoiceManagerAppendLoading,
  selectAdminInvoiceManagerCreating,
  selectAdminInvoiceManagerDeleting,
  selectAdminInvoiceManagerError,
  selectAdminInvoiceManagerHasMore,
  selectAdminInvoiceManagerInvoices,
  selectAdminInvoiceManagerIssuing,
  selectAdminInvoiceManagerLoading,
  selectAdminInvoiceManagerState,
  selectAdminInvoiceManagerUpdating,
} from './admin-invoice-manager.selectors';

@Injectable()
export class AdminInvoiceManagerFacade {
  private readonly store = inject(Store);

  readonly invoices$ = this.store.select(selectAdminInvoiceManagerInvoices);
  readonly loading$ = this.store.select(selectAdminInvoiceManagerLoading);
  readonly creating$ = this.store.select(selectAdminInvoiceManagerCreating);
  readonly updating$ = this.store.select(selectAdminInvoiceManagerUpdating);
  readonly issuing$ = this.store.select(selectAdminInvoiceManagerIssuing);
  readonly deleting$ = this.store.select(selectAdminInvoiceManagerDeleting);
  readonly actionLoading$ = this.store.select(selectAdminInvoiceManagerActionLoading);
  readonly error$ = this.store.select(selectAdminInvoiceManagerError);
  readonly hasMore$ = this.store.select(selectAdminInvoiceManagerHasMore);
  readonly appendLoading$ = this.store.select(selectAdminInvoiceManagerAppendLoading);
  readonly appendError$ = this.store.select(selectAdminInvoiceManagerAppendError);

  loadInvoices(params?: { search?: string; userId?: string }): void {
    this.store.dispatch(loadAdminInvoiceManager(params ?? {}));
  }

  loadMore(): void {
    this.store
      .select(selectAdminInvoiceManagerState)
      .pipe(take(1))
      .subscribe((state) => {
        if (!state.hasMore || state.appendLoading || state.loading) return;

        this.store.dispatch(
          loadMoreAdminInvoiceManager({
            offset: state.nextOffset,
            search: state.search ?? undefined,
            userId: state.userId ?? undefined,
          }),
        );
      });
  }

  createManualInvoice(dto: CreateManualInvoiceDto): void {
    this.store.dispatch(createManualInvoice({ dto }));
  }

  updateManualInvoice(invoiceRefId: string, dto: UpdateManualInvoiceDto): void {
    this.store.dispatch(updateManualInvoice({ invoiceRefId, dto }));
  }

  issueManualInvoice(invoiceRefId: string, dto?: IssueManualInvoiceDto): void {
    this.store.dispatch(issueManualInvoice({ invoiceRefId, dto }));
  }

  deleteManualInvoice(invoiceRefId: string): void {
    this.store.dispatch(deleteManualInvoice({ invoiceRefId }));
  }

  voidInvoice(invoiceRefId: string): void {
    this.store.dispatch(adminInvoiceManagerVoid({ invoiceRefId }));
  }

  markPaid(invoiceRefId: string, dto?: MarkInvoicePaymentStatusDto): void {
    this.store.dispatch(adminInvoiceManagerMarkPaid({ invoiceRefId, dto }));
  }

  markUnpaid(invoiceRefId: string, dto?: MarkInvoicePaymentStatusDto): void {
    this.store.dispatch(adminInvoiceManagerMarkUnpaid({ invoiceRefId, dto }));
  }
}
