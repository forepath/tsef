import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ServiceTypeEntity } from '../entities/service-type.entity';
import { hydrateEntitiesBySearchIds } from '../search/billing-search-hydrate.util';
import { applyBillingSearchIlike } from '../search/billing-search-ilike.util';
import { BillingSearchIndexService } from '../search/billing-search-index.service';
import { getRequiredTenantId } from '../utils/tenant-query.utils';

@Injectable()
export class ServiceTypesRepository {
  constructor(
    @InjectRepository(ServiceTypeEntity)
    private readonly repository: Repository<ServiceTypeEntity>,
    @Optional() private readonly billingSearchIndexService?: BillingSearchIndexService,
  ) {}

  async findByIdOrThrow(id: string): Promise<ServiceTypeEntity> {
    const entity = await this.repository.findOne({ where: { id, tenantId: getRequiredTenantId() } });

    if (!entity) {
      throw new NotFoundException(`Service type with ID ${id} not found`);
    }

    return entity;
  }

  async findById(id: string): Promise<ServiceTypeEntity | null> {
    return await this.repository.findOne({ where: { id, tenantId: getRequiredTenantId() } });
  }

  async findByKey(key: string): Promise<ServiceTypeEntity | null> {
    return await this.repository.findOne({ where: { key, tenantId: getRequiredTenantId() } });
  }

  async findAll(limit = 10, offset = 0, search?: string): Promise<ServiceTypeEntity[]> {
    if (search?.trim() && this.billingSearchIndexService) {
      const lookup = await this.billingSearchIndexService.searchIds('service-types', search.trim(), {
        tenantId: getRequiredTenantId(),
        limit,
        offset,
      });
      const hydrated = await hydrateEntitiesBySearchIds(this.repository, lookup);

      if (hydrated) {
        return hydrated.items;
      }
    }

    const qb = this.repository
      .createQueryBuilder('serviceType')
      .where('serviceType.tenant_id = :tenantId', { tenantId: getRequiredTenantId() })
      .orderBy('serviceType.createdAt', 'DESC')
      .take(limit)
      .skip(offset);

    if (search?.trim()) {
      applyBillingSearchIlike(qb, 'service-types', 'serviceType', search);
    }

    return await qb.getMany();
  }

  async create(dto: Partial<ServiceTypeEntity>): Promise<ServiceTypeEntity> {
    const entity = this.repository.create({
      ...dto,
      tenantId: dto.tenantId ?? getRequiredTenantId(),
    });

    return await this.repository.save(entity);
  }

  async update(id: string, dto: Partial<ServiceTypeEntity>): Promise<ServiceTypeEntity> {
    const entity = await this.findByIdOrThrow(id);

    Object.assign(entity, dto);

    return await this.repository.save(entity);
  }

  async delete(id: string): Promise<void> {
    const entity = await this.findByIdOrThrow(id);

    await this.repository.remove(entity);
  }
}
