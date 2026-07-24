import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { AddonEntity } from '../entities/addon.entity';
import { getRequiredTenantId } from '../utils/tenant-query.utils';

@Injectable()
export class AddonsRepository {
  constructor(
    @InjectRepository(AddonEntity)
    private readonly repository: Repository<AddonEntity>,
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

  async findAll(limit = 10, offset = 0): Promise<AddonEntity[]> {
    return await this.repository.find({
      where: { tenantId: getRequiredTenantId() },
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
    });
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
