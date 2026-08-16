import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { AddonEntity } from '../entities/addon.entity';
import { hydrateEntitiesBySearchIds } from '../search/billing-search-hydrate.util';
import { applyBillingSearchIlike } from '../search/billing-search-ilike.util';
import { BillingSearchIndexService } from '../search/billing-search-index.service';
import { getRequiredTenantId } from '../utils/tenant-query.utils';

@Injectable()
export class AddonsRepository {
  constructor(
    @InjectRepository(AddonEntity)
    private readonly repository: Repository<AddonEntity>,
    @Optional() private readonly billingSearchIndexService?: BillingSearchIndexService,
  ) {}

  async findByIdOrThrow(id: string): Promise<AddonEntity> {
    const entity = await this.repository.findOne({ where: { id, tenantId: getRequiredTenantId() } });

    if (!entity) {
      throw new NotFoundException(`Addon with ID ${id} not found`);
    }

    return entity;
  }

  async findById(id: string): Promise<AddonEntity | null> {
    return await this.repository.findOne({ where: { id, tenantId: getRequiredTenantId() } });
  }

  async findByIds(ids: string[]): Promise<AddonEntity[]> {
    if (ids.length === 0) {
      return [];
    }

    return await this.repository.find({
      where: { id: In(ids), tenantId: getRequiredTenantId() },
    });
  }

  async findByKey(key: string): Promise<AddonEntity | null> {
    return await this.repository.findOne({ where: { key, tenantId: getRequiredTenantId() } });
  }

  async findAll(limit = 10, offset = 0, search?: string): Promise<AddonEntity[]> {
    if (search?.trim() && this.billingSearchIndexService) {
      const lookup = await this.billingSearchIndexService.searchIds('addons', search.trim(), {
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
      .createQueryBuilder('addon')
      .where('addon.tenant_id = :tenantId', { tenantId: getRequiredTenantId() })
      .orderBy('addon.createdAt', 'DESC')
      .take(limit)
      .skip(offset);

    if (search?.trim()) {
      applyBillingSearchIlike(qb, 'addons', 'addon', search);
    }

    return await qb.getMany();
  }

  async findActive(limit = 100, offset = 0): Promise<AddonEntity[]> {
    return await this.repository.find({
      where: { tenantId: getRequiredTenantId(), isActive: true },
      take: limit,
      skip: offset,
      order: { name: 'ASC' },
    });
  }

  async create(dto: Partial<AddonEntity>): Promise<AddonEntity> {
    const { tenantId: _ignoredTenantId, ...rest } = dto;
    const entity = this.repository.create({
      ...rest,
      tenantId: getRequiredTenantId(),
    });

    return await this.repository.save(entity);
  }

  async update(id: string, dto: Partial<AddonEntity>): Promise<AddonEntity> {
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
