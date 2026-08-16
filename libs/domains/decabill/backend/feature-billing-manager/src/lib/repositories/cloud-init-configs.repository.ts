import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CloudInitConfigEntity } from '../entities/cloud-init-config.entity';
import { hydrateEntitiesBySearchIds } from '../search/billing-search-hydrate.util';
import { applyBillingSearchIlike } from '../search/billing-search-ilike.util';
import { BillingSearchIndexService } from '../search/billing-search-index.service';
import { getRequiredTenantId } from '../utils/tenant-query.utils';

@Injectable()
export class CloudInitConfigsRepository {
  constructor(
    @InjectRepository(CloudInitConfigEntity)
    private readonly repository: Repository<CloudInitConfigEntity>,
    @Optional() private readonly billingSearchIndexService?: BillingSearchIndexService,
  ) {}

  async findByIdOrThrow(id: string): Promise<CloudInitConfigEntity> {
    const entity = await this.repository.findOne({ where: { id, tenantId: getRequiredTenantId() } });

    if (!entity) {
      throw new NotFoundException(`CloudInit config with ID ${id} not found`);
    }

    return entity;
  }

  async findById(id: string): Promise<CloudInitConfigEntity | null> {
    return await this.repository.findOne({ where: { id, tenantId: getRequiredTenantId() } });
  }

  async findByKey(key: string): Promise<CloudInitConfigEntity | null> {
    return await this.repository.findOne({ where: { key, tenantId: getRequiredTenantId() } });
  }

  async findAll(limit = 10, offset = 0, search?: string): Promise<CloudInitConfigEntity[]> {
    if (search?.trim() && this.billingSearchIndexService) {
      const lookup = await this.billingSearchIndexService.searchIds('cloud-init-configs', search.trim(), {
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
      .createQueryBuilder('config')
      .where('config.tenant_id = :tenantId', { tenantId: getRequiredTenantId() })
      .orderBy('config.createdAt', 'DESC')
      .take(limit)
      .skip(offset);

    if (search?.trim()) {
      applyBillingSearchIlike(qb, 'cloud-init-configs', 'config', search);
    }

    return await qb.getMany();
  }

  async create(dto: Partial<CloudInitConfigEntity>): Promise<CloudInitConfigEntity> {
    const { tenantId: _ignoredTenantId, ...rest } = dto;
    const entity = this.repository.create({
      ...rest,
      tenantId: getRequiredTenantId(),
    });

    return await this.repository.save(entity);
  }

  async update(id: string, dto: Partial<CloudInitConfigEntity>): Promise<CloudInitConfigEntity> {
    const entity = await this.findByIdOrThrow(id);
    const { tenantId: _ignoredTenantId, ...safeDto } = dto;

    Object.assign(entity, safeDto);

    return await this.repository.save(entity);
  }

  async delete(id: string): Promise<void> {
    const entity = await this.findByIdOrThrow(id);

    await this.repository.remove(entity);
  }
}
