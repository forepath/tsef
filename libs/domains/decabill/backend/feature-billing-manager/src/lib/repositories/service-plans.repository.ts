import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { isNoneServiceTypeId } from '../constants/service-type-id.constants';
import { ServicePlanEntity } from '../entities/service-plan.entity';
import { hydrateEntitiesBySearchIds } from '../search/billing-search-hydrate.util';
import { applyBillingSearchIlike } from '../search/billing-search-ilike.util';
import { BillingSearchIndexService } from '../search/billing-search-index.service';
import { applyServicePlanTenantFilter, getRequiredTenantId } from '../utils/tenant-query.utils';

@Injectable()
export class ServicePlansRepository {
  constructor(
    @InjectRepository(ServicePlanEntity)
    private readonly repository: Repository<ServicePlanEntity>,
    @Optional() private readonly billingSearchIndexService?: BillingSearchIndexService,
  ) {}

  async findByIdOrThrow(id: string): Promise<ServicePlanEntity> {
    const entity = await this.repository
      .createQueryBuilder('plan')
      .leftJoinAndSelect('plan.serviceType', 'st')
      .where('plan.id = :id', { id })
      .andWhere('plan.tenant_id = :tenantId', { tenantId: getRequiredTenantId() })
      .getOne();

    if (!entity) {
      throw new NotFoundException(`Service plan with ID ${id} not found`);
    }

    return entity;
  }

  async findById(id: string): Promise<ServicePlanEntity | null> {
    return await this.repository
      .createQueryBuilder('plan')
      .leftJoinAndSelect('plan.serviceType', 'st')
      .where('plan.id = :id', { id })
      .andWhere('plan.tenant_id = :tenantId', { tenantId: getRequiredTenantId() })
      .getOne();
  }

  async findAll(limit = 10, offset = 0, search?: string): Promise<ServicePlanEntity[]> {
    if (search?.trim() && this.billingSearchIndexService) {
      const lookup = await this.billingSearchIndexService.searchIds('service-plans', search.trim(), {
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
      .createQueryBuilder('plan')
      .leftJoinAndSelect('plan.serviceType', 'st')
      .orderBy('plan.createdAt', 'DESC')
      .take(limit)
      .skip(offset);

    applyServicePlanTenantFilter(qb, 'plan');

    if (search?.trim()) {
      applyBillingSearchIlike(qb, 'service-plans', 'plan', search);
    }

    return await qb.getMany();
  }

  /**
   * Active plans with optional service type relation for public catalog.
   * When filtering by blank serviceTypeId, returns plans with a null service_type_id.
   */
  async findActiveWithServiceType(limit: number, offset: number, serviceTypeId?: string): Promise<ServicePlanEntity[]> {
    const qb = this.repository
      .createQueryBuilder('plan')
      .leftJoinAndSelect('plan.serviceType', 'st')
      .where('plan.is_active = :isActive', { isActive: true })
      .orderBy('plan.createdAt', 'DESC')
      .take(limit)
      .skip(offset);

    applyServicePlanTenantFilter(qb, 'plan');
    this.applyServiceTypeIdFilter(qb, serviceTypeId);

    return await qb.getMany();
  }

  /**
   * All active plans with optional service type (no pagination).
   */
  async findAllActiveWithServiceType(serviceTypeId?: string): Promise<ServicePlanEntity[]> {
    const qb = this.repository
      .createQueryBuilder('plan')
      .leftJoinAndSelect('plan.serviceType', 'st')
      .where('plan.is_active = :isActive', { isActive: true })
      .orderBy('plan.id', 'ASC');

    applyServicePlanTenantFilter(qb, 'plan');
    this.applyServiceTypeIdFilter(qb, serviceTypeId);

    return await qb.getMany();
  }

  async findAutoRecalculatePriceDaily(): Promise<ServicePlanEntity[]> {
    const qb = this.repository
      .createQueryBuilder('plan')
      .leftJoinAndSelect('plan.serviceType', 'st')
      .where('plan.auto_recalculate_price_daily = :enabled', { enabled: true })
      .andWhere('plan.service_type_id IS NOT NULL')
      .orderBy('plan.createdAt', 'ASC');

    applyServicePlanTenantFilter(qb, 'plan');

    return await qb.getMany();
  }

  async create(dto: Partial<ServicePlanEntity>): Promise<ServicePlanEntity> {
    const entity = this.repository.create({
      ...dto,
      tenantId: dto.tenantId ?? getRequiredTenantId(),
    });

    return await this.repository.save(entity);
  }

  async update(id: string, dto: Partial<ServicePlanEntity>): Promise<ServicePlanEntity> {
    const entity = await this.findByIdOrThrow(id);

    Object.assign(entity, dto);

    return await this.repository.save(entity);
  }

  async delete(id: string): Promise<void> {
    const entity = await this.findByIdOrThrow(id);

    await this.repository.remove(entity);
  }

  private applyServiceTypeIdFilter(
    qb: ReturnType<Repository<ServicePlanEntity>['createQueryBuilder']>,
    serviceTypeId?: string,
  ): void {
    // Omitted query param → no filter. Blank string → none plans (NULL service_type_id).
    if (serviceTypeId === undefined) {
      return;
    }

    if (isNoneServiceTypeId(serviceTypeId)) {
      qb.andWhere('plan.service_type_id IS NULL');

      return;
    }

    const trimmedTypeId = serviceTypeId.trim();

    qb.andWhere('plan.service_type_id = :serviceTypeId', { serviceTypeId: trimmedTypeId });
  }
}
