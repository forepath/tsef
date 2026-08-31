import { TaxCategory } from '../constants/tax-category.constants';
import type { SupplierInvoiceLineItemDto } from '../dto/supplier-invoice.dto';
import type { LineItemInput } from '../services/tax-calculation.service';

export function mapSupplierInvoiceLineItemsToInputs(items: SupplierInvoiceLineItemDto[]): LineItemInput[] {
  return items.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unitPriceNet: item.unitPriceNet,
    taxCategory: item.taxCategory ?? TaxCategory.STANDARD,
    taxRate: item.taxRate,
  }));
}
