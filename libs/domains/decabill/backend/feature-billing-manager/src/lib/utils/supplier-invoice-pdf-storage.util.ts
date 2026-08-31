import type { SupplierInvoiceEntity } from '../entities/supplier-invoice.entity';

export function buildSupplierInvoicePdfStorageKey(invoice: SupplierInvoiceEntity, suffix = '.pdf'): string {
  const base = invoice.invoiceNumber ?? invoice.id;

  return `${base}${suffix}`;
}
