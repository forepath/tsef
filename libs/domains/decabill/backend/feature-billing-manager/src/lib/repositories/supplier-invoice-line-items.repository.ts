import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SupplierInvoiceLineItemEntity } from '../entities/supplier-invoice-line-item.entity';

@Injectable()
export class SupplierInvoiceLineItemsRepository {
  constructor(
    @InjectRepository(SupplierInvoiceLineItemEntity)
    private readonly repository: Repository<SupplierInvoiceLineItemEntity>,
  ) {}

  async deleteByInvoiceId(invoiceId: string): Promise<void> {
    await this.repository.delete({ invoiceId });
  }

  async createMany(items: Partial<SupplierInvoiceLineItemEntity>[]): Promise<SupplierInvoiceLineItemEntity[]> {
    if (items.length === 0) {
      return [];
    }

    const entities = this.repository.create(items);

    return await this.repository.save(entities);
  }
}
