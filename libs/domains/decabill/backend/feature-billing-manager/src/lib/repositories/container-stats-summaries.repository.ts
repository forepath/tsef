import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ContainerStatsSummaryEntity } from '../entities/container-stats-summary.entity';
import { getRequiredTenantId } from '../utils/tenant-query.utils';

export interface ContainerStatsSummaryView {
  containerCount: number;
  healthyCount: number;
  lastCollectedAt: string;
}

@Injectable()
export class ContainerStatsSummariesRepository {
  constructor(
    @InjectRepository(ContainerStatsSummaryEntity)
    private readonly repository: Repository<ContainerStatsSummaryEntity>,
  ) {}

  async findByItemId(itemId: string): Promise<ContainerStatsSummaryView | null> {
    const row = await this.repository.findOne({
      where: { itemId, tenantId: getRequiredTenantId() },
    });

    if (!row) {
      return null;
    }

    return {
      containerCount: row.containerCount,
      healthyCount: row.healthyCount,
      lastCollectedAt: row.lastCollectedAt.toISOString(),
    };
  }

  async upsertSummary(params: {
    itemId: string;
    subscriptionId: string;
    containerCount: number;
    healthyCount: number;
    lastCollectedAt: Date;
  }): Promise<void> {
    const tenantId = getRequiredTenantId();
    const existing = await this.repository.findOne({ where: { itemId: params.itemId, tenantId } });
    const entity =
      existing ??
      this.repository.create({
        itemId: params.itemId,
        tenantId,
        subscriptionId: params.subscriptionId,
      });

    entity.subscriptionId = params.subscriptionId;
    entity.containerCount = params.containerCount;
    entity.healthyCount = params.healthyCount;
    entity.lastCollectedAt = params.lastCollectedAt;

    await this.repository.save(entity);
  }
}
