import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { applyProjectTenantFilter, getRequiredTenantId } from '../../utils/tenant-query.utils';
import { BillingSearchIndexService } from '../../search/billing-search-index.service';
import { ProjectEntity } from '../entities/project.entity';
import { ProjectStatus } from '../entities/project.enums';

@Injectable()
export class ProjectsRepository {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly repository: Repository<ProjectEntity>,
    @Optional() private readonly billingSearchIndexService?: BillingSearchIndexService,
  ) {}

  async findByIdOrThrow(id: string): Promise<ProjectEntity> {
    const qb = this.repository.createQueryBuilder('project').where('project.id = :id', { id });

    applyProjectTenantFilter(qb, 'project');

    const entity = await qb.getOne();

    if (!entity) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return entity;
  }

  async findByIdForUser(userId: string, id: string): Promise<ProjectEntity | null> {
    return await this.repository
      .createQueryBuilder('project')
      .innerJoin('users', 'user', 'user.id = project.user_id')
      .where('project.id = :id', { id })
      .andWhere('project.user_id = :userId', { userId })
      .andWhere('user.tenant_id = :tenantId', { tenantId: getRequiredTenantId() })
      .getOne();
  }

  async findAllByUser(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<{ items: ProjectEntity[]; total: number }> {
    const qb = this.repository
      .createQueryBuilder('project')
      .innerJoin('users', 'user', 'user.id = project.user_id')
      .where('project.user_id = :userId', { userId })
      .andWhere('user.tenant_id = :tenantId', { tenantId: getRequiredTenantId() })
      .orderBy('project.updatedAt', 'DESC');

    const total = await qb.getCount();
    const items = await qb.take(limit).skip(offset).getMany();

    return { items, total };
  }

  async findAll(
    limit: number,
    offset: number,
    options?: { search?: string; userId?: string },
  ): Promise<{ items: ProjectEntity[]; total: number }> {
    if (options?.search?.trim() && this.billingSearchIndexService) {
      const lookup = await this.billingSearchIndexService.searchIds('projects', options.search.trim(), {
        tenantId: getRequiredTenantId(),
        limit,
        offset,
        extraFilters: options.userId ? { userId: options.userId } : undefined,
      });

      if (lookup) {
        if (lookup.ids.length === 0) {
          return { items: [], total: lookup.total };
        }

        const found = await this.repository.findBy({ id: In(lookup.ids) });
        const byId = new Map(found.map((item) => [item.id, item]));
        const items = lookup.ids.map((id) => byId.get(id)).filter((item): item is ProjectEntity => item != null);

        return { items, total: lookup.total };
      }
    }

    const qb = this.repository.createQueryBuilder('project').orderBy('project.updatedAt', 'DESC');

    applyProjectTenantFilter(qb, 'project');

    if (options?.userId) {
      qb.andWhere('project.user_id = :filterUserId', { filterUserId: options.userId });
    }

    if (options?.search?.trim()) {
      qb.andWhere('project.name ILIKE :search', { search: `%${options.search.trim()}%` });
    }

    const total = await qb.getCount();
    const items = await qb.take(limit).skip(offset).getMany();

    return { items, total };
  }

  async countBilledTimeEntries(projectId: string): Promise<number> {
    const result = await this.repository.manager
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('billing_project_time_entries', 'te')
      .where('te.project_id = :projectId', { projectId })
      .andWhere('te.billed_at IS NOT NULL')
      .getRawOne<{ count: string }>();

    return parseInt(result?.count ?? '0', 10);
  }

  async countUnbilledTimeEntries(projectId: string): Promise<number> {
    const result = await this.repository.manager
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('billing_project_time_entries', 'te')
      .where('te.project_id = :projectId', { projectId })
      .andWhere('te.billed_at IS NULL')
      .getRawOne<{ count: string }>();

    return parseInt(result?.count ?? '0', 10);
  }

  async countByStatus(status: ProjectStatus): Promise<number> {
    const qb = this.repository.createQueryBuilder('project').where('project.status = :status', { status });

    applyProjectTenantFilter(qb, 'project');

    return await qb.getCount();
  }

  async create(dto: Partial<ProjectEntity>): Promise<ProjectEntity> {
    const entity = this.repository.create(dto);

    return await this.repository.save(entity);
  }

  async update(id: string, dto: Partial<ProjectEntity>): Promise<ProjectEntity> {
    const entity = await this.findByIdOrThrow(id);

    Object.assign(entity, dto);

    return await this.repository.save(entity);
  }

  async delete(id: string): Promise<void> {
    await this.findByIdOrThrow(id);
    await this.repository.delete(id);
  }
}
