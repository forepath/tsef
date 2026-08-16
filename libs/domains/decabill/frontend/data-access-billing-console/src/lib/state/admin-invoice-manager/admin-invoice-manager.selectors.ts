import { createFeatureSelector, createSelector } from '@ngrx/store';

import type { AdminInvoiceManagerState } from './admin-invoice-manager.reducer';

export const selectAdminInvoiceManagerState = createFeatureSelector<AdminInvoiceManagerState>('adminInvoiceManager');

export const selectAdminInvoiceManagerInvoices = createSelector(
  selectAdminInvoiceManagerState,
  (state) => state.invoices,
);

export const selectAdminInvoiceManagerLoading = createSelector(
  selectAdminInvoiceManagerState,
  (state) => state.loading,
);

export const selectAdminInvoiceManagerCreating = createSelector(
  selectAdminInvoiceManagerState,
  (state) => state.creating,
);

export const selectAdminInvoiceManagerUpdating = createSelector(
  selectAdminInvoiceManagerState,
  (state) => state.updating,
);

export const selectAdminInvoiceManagerIssuing = createSelector(
  selectAdminInvoiceManagerState,
  (state) => state.issuing,
);

export const selectAdminInvoiceManagerDeleting = createSelector(
  selectAdminInvoiceManagerState,
  (state) => state.deleting,
);

export const selectAdminInvoiceManagerActionLoading = createSelector(
  selectAdminInvoiceManagerState,
  (state) => state.actionLoading,
);

export const selectAdminInvoiceManagerError = createSelector(selectAdminInvoiceManagerState, (state) => state.error);

export const selectAdminInvoiceManagerHasMore = createSelector(
  selectAdminInvoiceManagerState,
  (state) => state.hasMore,
);

export const selectAdminInvoiceManagerAppendLoading = createSelector(
  selectAdminInvoiceManagerState,
  (state) => state.appendLoading,
);

export const selectAdminInvoiceManagerAppendError = createSelector(
  selectAdminInvoiceManagerState,
  (state) => state.appendError,
);
