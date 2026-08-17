import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CONTAINER_MANAGER_HISTORY_MAX_POINTS } from '../contributors/container-manager/constants/container-manager.constants';
import type { ContainerManagerStatsHistoryPointDto } from '../contributors/container-manager/dto/container-manager.dto';
import {
  ContainerStatsSampleEntity,
  type ContainerStatsSamplePayload,
} from '../entities/container-stats-sample.entity';
import { getRequiredTenantId } from '../utils/tenant-query.utils';

@Injectable()
export class ContainerStatsSamplesRepository {
  constructor(
    @InjectRepository(ContainerStatsSampleEntity)
    private readonly repository: Repository<ContainerStatsSampleEntity>,
  ) {}

  async insertSample(params: {
    subscriptionId: string;
    itemId: string;
    containerId: string;
    collectedAt: Date;
    stats: ContainerStatsSamplePayload;
  }): Promise<void> {
    const entity = this.repository.create({
      tenantId: getRequiredTenantId(),
      subscriptionId: params.subscriptionId,
      itemId: params.itemId,
      containerId: params.containerId,
      collectedAt: params.collectedAt,
      stats: params.stats,
    });

    await this.repository.save(entity);
  }

  async trimToMaxPoints(
    itemId: string,
    containerId: string,
    maxPoints = CONTAINER_MANAGER_HISTORY_MAX_POINTS,
  ): Promise<void> {
    const tenantId = getRequiredTenantId();

    await this.repository.query(
      `
      DELETE FROM "billing_container_stats_samples"
      WHERE "tenant_id" = $1
        AND "item_id" = $2
        AND "container_id" = $3
        AND "id" NOT IN (
          SELECT "id" FROM "billing_container_stats_samples"
          WHERE "tenant_id" = $1 AND "item_id" = $2 AND "container_id" = $3
          ORDER BY "collected_at" DESC
          LIMIT $4
        )
      `,
      [tenantId, itemId, containerId, maxPoints],
    );
  }

  async findLatestPoints(
    itemId: string,
    containerId: string,
    limit = CONTAINER_MANAGER_HISTORY_MAX_POINTS,
  ): Promise<ContainerManagerStatsHistoryPointDto[]> {
    const rows = await this.repository.find({
      where: { tenantId: getRequiredTenantId(), itemId, containerId },
      order: { collectedAt: 'DESC' },
      take: limit,
    });

    return rows
      .slice()
      .reverse()
      .map((row) => ({
        timestamp: row.collectedAt.toISOString(),
        cpuPercent: row.stats.cpuPercent ?? null,
        memoryPercent: row.stats.memoryPercent ?? null,
        memoryUsageBytes: row.stats.memoryUsageBytes ?? null,
        memoryLimitBytes: row.stats.memoryLimitBytes ?? null,
        blockReadBytes: row.stats.blockReadBytes ?? null,
        blockWriteBytes: row.stats.blockWriteBytes ?? null,
        networkRxBytes: row.stats.networkRxBytes ?? null,
        networkTxBytes: row.stats.networkTxBytes ?? null,
      }));
  }
}
