import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { take } from 'rxjs';

import type {
  IssueSupplierInvoiceDto,
  MarkSupplierInvoicePaymentStatusDto,
  SupplierExpenseStatisticsParams,
  UpdateSupplierInvoiceDto,
} from '../../types/suppliers.types';

import {
  adminSupplierInvoiceManagerMarkPaid,
  adminSupplierInvoiceManagerMarkUnpaid,
  adminSupplierInvoiceManagerVoid,
  clearSupplierInvoiceParsePreview,
  createSupplierInvoice,
  deleteSupplierInvoice,
  issueSupplierInvoice,
  loadAdminSupplierInvoiceManager,
  loadAdminSupplierInvoiceSummary,
  loadMoreAdminSupplierInvoiceManager,
  parseSupplierInvoiceDocument,
  updateSupplierInvoice,
} from './admin-supplier-invoice-manager.actions';
import {
  selectAdminSupplierInvoiceManagerActionLoading,
  selectAdminSupplierInvoiceManagerAppendError,
  selectAdminSupplierInvoiceManagerAppendLoading,
  selectAdminSupplierInvoiceManagerCreating,
  selectAdminSupplierInvoiceManagerDeleting,
  selectAdminSupplierInvoiceManagerError,
  selectAdminSupplierInvoiceManagerHasMore,
  selectAdminSupplierInvoiceManagerInvoices,
  selectAdminSupplierInvoiceManagerIssuing,
  selectAdminSupplierInvoiceManagerLoading,
  selectAdminSupplierInvoiceManagerParsing,
  selectAdminSupplierInvoiceManagerState,
  selectAdminSupplierInvoiceManagerUpdating,
  selectAdminSupplierInvoiceParseError,
  selectAdminSupplierInvoiceParsePreview,
  selectAdminSupplierInvoiceSummary,
  selectAdminSupplierInvoiceSummaryError,
  selectAdminSupplierInvoiceSummaryLoading,
} from './admin-supplier-invoice-manager.selectors';

@Injectable()
export class AdminSupplierInvoiceManagerFacade {
  private readonly store = inject(Store);

  readonly summary$ = this.store.select(selectAdminSupplierInvoiceSummary);
  readonly summaryLoading$ = this.store.select(selectAdminSupplierInvoiceSummaryLoading);
  readonly summaryError$ = this.store.select(selectAdminSupplierInvoiceSummaryError);
  readonly invoices$ = this.store.select(selectAdminSupplierInvoiceManagerInvoices);
  readonly loading$ = this.store.select(selectAdminSupplierInvoiceManagerLoading);
  readonly creating$ = this.store.select(selectAdminSupplierInvoiceManagerCreating);
  readonly updating$ = this.store.select(selectAdminSupplierInvoiceManagerUpdating);
  readonly issuing$ = this.store.select(selectAdminSupplierInvoiceManagerIssuing);
  readonly deleting$ = this.store.select(selectAdminSupplierInvoiceManagerDeleting);
  readonly parsing$ = this.store.select(selectAdminSupplierInvoiceManagerParsing);
  readonly parsePreview$ = this.store.select(selectAdminSupplierInvoiceParsePreview);
  readonly parseError$ = this.store.select(selectAdminSupplierInvoiceParseError);
  readonly actionLoading$ = this.store.select(selectAdminSupplierInvoiceManagerActionLoading);
  readonly error$ = this.store.select(selectAdminSupplierInvoiceManagerError);
  readonly hasMore$ = this.store.select(selectAdminSupplierInvoiceManagerHasMore);
  readonly appendLoading$ = this.store.select(selectAdminSupplierInvoiceManagerAppendLoading);
  readonly appendError$ = this.store.select(selectAdminSupplierInvoiceManagerAppendError);

  loadSummary(params?: SupplierExpenseStatisticsParams): void {
    this.store.dispatch(loadAdminSupplierInvoiceSummary({ params }));
  }

  loadInvoices(params?: { search?: string; status?: string }): void {
    this.store.dispatch(loadAdminSupplierInvoiceManager(params ?? {}));
  }

  loadMore(): void {
    this.store
      .select(selectAdminSupplierInvoiceManagerState)
      .pipe(take(1))
      .subscribe((state) => {
        if (!state.hasMore || state.appendLoading || state.loading) return;

        this.store.dispatch(
          loadMoreAdminSupplierInvoiceManager({
            offset: state.nextOffset,
            search: state.search ?? undefined,
            status: state.status ?? undefined,
          }),
        );
      });
  }

  parseDocument(file: File): void {
    this.store.dispatch(parseSupplierInvoiceDocument({ file }));
  }

  clearParsePreview(): void {
    this.store.dispatch(clearSupplierInvoiceParsePreview());
  }

  createInvoice(formData: FormData): void {
    this.store.dispatch(createSupplierInvoice({ formData }));
  }

  updateInvoice(invoiceId: string, dto: UpdateSupplierInvoiceDto): void {
    this.store.dispatch(updateSupplierInvoice({ invoiceId, dto }));
  }

  issueInvoice(invoiceId: string, dto?: IssueSupplierInvoiceDto): void {
    this.store.dispatch(issueSupplierInvoice({ invoiceId, dto }));
  }

  deleteInvoice(invoiceId: string): void {
    this.store.dispatch(deleteSupplierInvoice({ invoiceId }));
  }

  voidInvoice(invoiceId: string): void {
    this.store.dispatch(adminSupplierInvoiceManagerVoid({ invoiceId }));
  }

  markPaid(invoiceId: string, dto?: MarkSupplierInvoicePaymentStatusDto): void {
    this.store.dispatch(adminSupplierInvoiceManagerMarkPaid({ invoiceId, dto }));
  }

  markUnpaid(invoiceId: string, dto?: MarkSupplierInvoicePaymentStatusDto): void {
    this.store.dispatch(adminSupplierInvoiceManagerMarkUnpaid({ invoiceId, dto }));
  }
}
