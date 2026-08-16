import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DatevExportScope, DatevExportStatus } from '../constants/datev-export.constants';
import { DatevExportEntity } from '../entities/datev-export.entity';
import { hydrateEntitiesBySearchIds } from '../search/billing-search-hydrate.util';
import { applyBillingSearchIlike } from '../search/billing-search-ilike.util';
import { BillingSearchIndexService } from '../search/billing-search-index.service';
import { getRequiredTenantId } from '../utils/tenant-query.utils';

export interface DatevExportListParams {
  scope: DatevExportScope;
  tenantId?: string;
  year?: number;
  limit: number;
  offset: number;
  search?: string;
}

@Injectable()
export class DatevExportRepository {
  constructor(
    @InjectRepository(DatevExportEntity)
    private readonly repository: Repository<DatevExportEntity>,
    @Optional() private readonly billingSearchIndexService?: BillingSearchIndexService,
  ) {}

  async findById(id: string): Promise<DatevExportEntity | null> {
    return await this.repository.findOne({ where: { id } });
  }

  async findByPeriod(
    scope: DatevExportScope,
    tenantId: string,
    year: number,
    month: number,
  ): Promise<DatevExportEntity | null> {
    return await this.repository.findOne({
      where: {
        scope,
        tenantId,
        periodYear: year,
        periodMonth: month,
      },
    });
  }

  async findAllForAdmin(params: DatevExportListParams): Promise<{ items: DatevExportEntity[]; total: number }> {
    const search = params.search?.trim();

    if (search && this.billingSearchIndexService) {
      const lookup = await this.billingSearchIndexService.searchIds('datev-exports', search, {
        tenantId: getRequiredTenantId(),
        limit: params.limit,
        offset: params.offset,
      });
      const hydrated = await hydrateEntitiesBySearchIds(this.repository, lookup);

      if (hydrated) {
        return hydrated;
      }
    }

    const qb = this.repository.createQueryBuilder('export').where('export.scope = :scope', { scope: params.scope });

    if (params.scope === DatevExportScope.TENANT && params.tenantId) {
      qb.andWhere('export.tenant_id = :tenantId', { tenantId: params.tenantId });
    }

    if (params.year != null) {
      qb.andWhere('export.period_year = :year', { year: params.year });
    }

    if (search) {
      applyBillingSearchIlike(qb, 'datev-exports', 'export', search);
    }

    const total = await qb.getCount();
    const items = await qb
      .orderBy('export.period_year', 'DESC')
      .addOrderBy('export.period_month', 'DESC')
      .addOrderBy('export.created_at', 'DESC')
      .take(params.limit)
      .skip(params.offset)
      .getMany();

    return { items, total };
  }

  async create(data: Partial<DatevExportEntity>): Promise<DatevExportEntity> {
    const entity = this.repository.create(data);

    return await this.repository.save(entity);
  }

  async update(id: string, data: Partial<DatevExportEntity>): Promise<DatevExportEntity | null> {
    await this.repository.update(id, data);

    return await this.findById(id);
  }
}

export { DatevExportScope, DatevExportStatus };
