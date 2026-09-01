import { createReducer, on } from '@ngrx/store';

import type {
  AdminSupplierInvoiceListItem,
  SupplierExpenseSummaryResponse,
  SupplierInvoiceParsePreviewResponse,
} from '../../types/suppliers.types';

import {
  adminSupplierInvoiceManagerMarkPaid,
  adminSupplierInvoiceManagerMarkPaidFailure,
  adminSupplierInvoiceManagerMarkPaidSuccess,
  adminSupplierInvoiceManagerMarkUnpaid,
  adminSupplierInvoiceManagerMarkUnpaidFailure,
  adminSupplierInvoiceManagerMarkUnpaidSuccess,
  adminSupplierInvoiceManagerVoid,
  adminSupplierInvoiceManagerVoidFailure,
  adminSupplierInvoiceManagerVoidSuccess,
  clearSupplierInvoiceParsePreview,
  createSupplierInvoice,
  createSupplierInvoiceFailure,
  createSupplierInvoiceSuccess,
  deleteSupplierInvoice,
  deleteSupplierInvoiceFailure,
  deleteSupplierInvoiceSuccess,
  issueSupplierInvoice,
  issueSupplierInvoiceFailure,
  issueSupplierInvoiceSuccess,
  loadAdminSupplierInvoiceManager,
  loadAdminSupplierInvoiceManagerFailure,
  loadAdminSupplierInvoiceManagerSuccess,
  loadAdminSupplierInvoiceSummary,
  loadAdminSupplierInvoiceSummaryFailure,
  loadAdminSupplierInvoiceSummarySuccess,
  loadMoreAdminSupplierInvoiceManager,
  loadMoreAdminSupplierInvoiceManagerFailure,
  loadMoreAdminSupplierInvoiceManagerSuccess,
  parseSupplierInvoiceDocument,
  parseSupplierInvoiceDocumentFailure,
  parseSupplierInvoiceDocumentSuccess,
  updateSupplierInvoice,
  updateSupplierInvoiceFailure,
  updateSupplierInvoiceSuccess,
} from './admin-supplier-invoice-manager.actions';

export interface AdminSupplierInvoiceManagerState {
  summary: SupplierExpenseSummaryResponse | null;
  summaryLoading: boolean;
  summaryError: string | null;
  invoices: AdminSupplierInvoiceListItem[];
  loading: boolean;
  creating: boolean;
  updating: boolean;
  issuing: boolean;
  deleting: boolean;
  parsing: boolean;
  parsePreview: SupplierInvoiceParsePreviewResponse | null;
  parseError: string | null;
  actionLoading: boolean;
  error: string | null;
  hasMore: boolean;
  nextOffset: number;
  appendLoading: boolean;
  appendError: string | null;
  search: string | null;
  status: string | null;
}

export const initialAdminSupplierInvoiceManagerState: AdminSupplierInvoiceManagerState = {
  summary: null,
  summaryLoading: false,
  summaryError: null,
  invoices: [],
  loading: false,
  creating: false,
  updating: false,
  issuing: false,
  deleting: false,
  parsing: false,
  parsePreview: null,
  parseError: null,
  actionLoading: false,
  error: null,
  hasMore: false,
  nextOffset: 0,
  appendLoading: false,
  appendError: null,
  search: null,
  status: null,
};

function upsertInvoice(
  invoices: AdminSupplierInvoiceListItem[],
  invoice: AdminSupplierInvoiceListItem,
): AdminSupplierInvoiceListItem[] {
  const index = invoices.findIndex((item) => item.id === invoice.id);

  if (index === -1) {
    return [invoice, ...invoices];
  }

  const next = [...invoices];

  next[index] = invoice;

  return next;
}

export const adminSupplierInvoiceManagerReducer = createReducer(
  initialAdminSupplierInvoiceManagerState,
  on(loadAdminSupplierInvoiceSummary, (state) => ({
    ...state,
    summaryLoading: true,
    summaryError: null,
  })),
  on(loadAdminSupplierInvoiceSummarySuccess, (state, { summary }) => ({
    ...state,
    summary,
    summaryLoading: false,
    summaryError: null,
  })),
  on(loadAdminSupplierInvoiceSummaryFailure, (state, { error }) => ({
    ...state,
    summaryLoading: false,
    summaryError: error,
  })),
  on(loadAdminSupplierInvoiceManager, (state, { search, status }) => ({
    ...state,
    invoices: [],
    loading: true,
    error: null,
    appendError: null,
    appendLoading: false,
    hasMore: false,
    nextOffset: 0,
    search: search?.trim() ? search.trim() : null,
    status: status?.trim() ? status.trim() : null,
  })),
  on(loadAdminSupplierInvoiceManagerSuccess, (state, { invoices, hasMore, nextOffset }) => ({
    ...state,
    invoices,
    hasMore,
    nextOffset,
    loading: false,
    error: null,
  })),
  on(loadAdminSupplierInvoiceManagerFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
    hasMore: false,
  })),
  on(loadMoreAdminSupplierInvoiceManager, (state) => ({
    ...state,
    appendLoading: true,
    appendError: null,
  })),
  on(loadMoreAdminSupplierInvoiceManagerSuccess, (state, { invoices, hasMore, nextOffset }) => ({
    ...state,
    invoices: [...state.invoices, ...invoices],
    hasMore,
    nextOffset,
    appendLoading: false,
    appendError: null,
  })),
  on(loadMoreAdminSupplierInvoiceManagerFailure, (state, { error }) => ({
    ...state,
    appendLoading: false,
    appendError: error,
  })),
  on(parseSupplierInvoiceDocument, (state) => ({
    ...state,
    parsing: true,
    parseError: null,
  })),
  on(parseSupplierInvoiceDocumentSuccess, (state, { preview }) => ({
    ...state,
    parsing: false,
    parsePreview: preview,
    parseError: null,
  })),
  on(parseSupplierInvoiceDocumentFailure, (state, { error }) => ({
    ...state,
    parsing: false,
    parseError: error,
  })),
  on(clearSupplierInvoiceParsePreview, (state) => ({
    ...state,
    parsePreview: null,
    parseError: null,
  })),
  on(createSupplierInvoice, (state) => ({ ...state, creating: true, error: null })),
  on(createSupplierInvoiceSuccess, (state, { invoice }) => ({
    ...state,
    creating: false,
    invoices: upsertInvoice(state.invoices, invoice),
  })),
  on(createSupplierInvoiceFailure, (state, { error }) => ({ ...state, creating: false, error })),
  on(updateSupplierInvoice, (state) => ({ ...state, updating: true, error: null })),
  on(updateSupplierInvoiceSuccess, (state, { invoice }) => ({
    ...state,
    updating: false,
    invoices: upsertInvoice(state.invoices, invoice),
  })),
  on(updateSupplierInvoiceFailure, (state, { error }) => ({ ...state, updating: false, error })),
  on(issueSupplierInvoice, (state) => ({ ...state, issuing: true, error: null })),
  on(issueSupplierInvoiceSuccess, (state, { invoice }) => ({
    ...state,
    issuing: false,
    invoices: upsertInvoice(state.invoices, invoice),
  })),
  on(issueSupplierInvoiceFailure, (state, { error }) => ({ ...state, issuing: false, error })),
  on(deleteSupplierInvoice, (state) => ({ ...state, deleting: true, error: null })),
  on(deleteSupplierInvoiceSuccess, (state, { invoiceId }) => ({
    ...state,
    deleting: false,
    invoices: state.invoices.filter((invoice) => invoice.id !== invoiceId),
  })),
  on(deleteSupplierInvoiceFailure, (state, { error }) => ({ ...state, deleting: false, error })),
  on(
    adminSupplierInvoiceManagerVoid,
    adminSupplierInvoiceManagerMarkPaid,
    adminSupplierInvoiceManagerMarkUnpaid,
    (state) => ({
      ...state,
      actionLoading: true,
      error: null,
    }),
  ),
  on(
    adminSupplierInvoiceManagerVoidSuccess,
    adminSupplierInvoiceManagerMarkPaidSuccess,
    adminSupplierInvoiceManagerMarkUnpaidSuccess,
    (state, { invoice }) => ({
      ...state,
      actionLoading: false,
      invoices: upsertInvoice(state.invoices, invoice),
    }),
  ),
  on(
    adminSupplierInvoiceManagerVoidFailure,
    adminSupplierInvoiceManagerMarkPaidFailure,
    adminSupplierInvoiceManagerMarkUnpaidFailure,
    (state, { error }) => ({ ...state, actionLoading: false, error }),
  ),
);
