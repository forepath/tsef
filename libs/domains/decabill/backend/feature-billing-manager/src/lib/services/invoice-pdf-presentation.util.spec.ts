import { InvoiceStatus } from '../constants/invoice-status.constants';
import type { InvoiceEntity } from '../entities/invoice.entity';

import { buildInvoicePdfPresentation, resolveInvoicePdfIssueDate } from './invoice-pdf-presentation.util';

describe('invoice-pdf-presentation.util', () => {
  const invoice = {
    id: 'inv-1',
    invoiceNumber: 'INV-2026-00001',
    status: InvoiceStatus.ISSUED,
    issuedAt: new Date('2026-08-31T16:13:56.949Z'),
    createdAt: new Date('2026-08-31T16:12:00.000Z'),
  } as InvoiceEntity;

  it('resolveInvoicePdfIssueDate prefers calendar documentIssueDate over issuedAt', () => {
    expect(resolveInvoicePdfIssueDate(invoice, '2026-08-01').toISOString().slice(0, 10)).toBe('2026-08-01');
  });

  it('resolveInvoicePdfIssueDate prefers invoice.issueDate when present', () => {
    const supplierLike = { ...invoice, issueDate: '2026-08-01' } as InvoiceEntity & { issueDate: string };

    expect(resolveInvoicePdfIssueDate(supplierLike).toISOString().slice(0, 10)).toBe('2026-08-01');
  });

  it('resolveInvoicePdfIssueDate falls back to issuedAt for customer invoices', () => {
    expect(resolveInvoicePdfIssueDate(invoice).toISOString()).toBe(invoice.issuedAt!.toISOString());
  });

  it('buildInvoicePdfPresentation uses documentIssueDate option', () => {
    const presentation = buildInvoicePdfPresentation(invoice, { documentIssueDate: '2026-08-01' });

    expect(presentation.issueDate.toISOString().slice(0, 10)).toBe('2026-08-01');
  });
});
