import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DatevCreditorAccountEntity } from '../entities/datev-creditor-account.entity';

@Injectable()
export class DatevCreditorAccountsRepository {
  constructor(
    @InjectRepository(DatevCreditorAccountEntity)
    private readonly repository: Repository<DatevCreditorAccountEntity>,
  ) {}

  async findByTenantAndSupplierId(tenantId: string, supplierId: string): Promise<DatevCreditorAccountEntity | null> {
    return await this.repository.findOne({ where: { tenantId, supplierId } });
  }

  async findMaxCreditorNumber(allocationScope: string): Promise<number | null> {
    const row = await this.repository
      .createQueryBuilder('creditor')
      .select('MAX(creditor.creditor_number)', 'max')
      .where('creditor.allocation_scope = :allocationScope', { allocationScope })
      .getRawOne<{ max: string | null }>();

    if (row?.max == null) {
      return null;
    }

    const parsed = parseInt(String(row.max), 10);

    return Number.isFinite(parsed) ? parsed : null;
  }

  async create(
    tenantId: string,
    supplierId: string,
    creditorNumber: number,
    allocationScope: string,
  ): Promise<DatevCreditorAccountEntity> {
    const entity = this.repository.create({ tenantId, supplierId, creditorNumber, allocationScope });

    return await this.repository.save(entity);
  }
}
