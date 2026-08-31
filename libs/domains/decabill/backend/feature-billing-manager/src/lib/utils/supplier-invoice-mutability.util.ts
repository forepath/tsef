import { BadRequestException } from '@nestjs/common';

import { InvoiceStatus } from '../constants/invoice-status.constants';
import type { SupplierInvoiceEntity } from '../entities/supplier-invoice.entity';

export function assertSupplierInvoiceDraftEditable(invoice: SupplierInvoiceEntity): void {
  if (invoice.status !== InvoiceStatus.DRAFT) {
    throw new BadRequestException('Only draft supplier invoices can be modified');
  }
}
