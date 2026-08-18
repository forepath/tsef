import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ContributorJobRunEntity } from '../entities/contributor-job-run.entity';
import { getRequiredTenantId } from '../utils/tenant-query.utils';

@Injectable()
export class ContributorJobRunsRepository {
  constructor(
    @InjectRepository(ContributorJobRunEntity)
    private readonly repository: Repository<ContributorJobRunEntity>,
  ) {}

  async findByIdentity(source: string, sourceKey: string, jobKey: string): Promise<ContributorJobRunEntity | null> {
    return await this.repository.findOne({
      where: { tenantId: getRequiredTenantId(), source, sourceKey, jobKey },
    });
  }

  async upsertRun(params: {
    source: string;
    sourceKey: string;
    jobKey: string;
    lastStartedAt: Date;
    lastFinishedAt: Date | null;
    lastError: string | null;
  }): Promise<ContributorJobRunEntity> {
    const tenantId = getRequiredTenantId();
    const existing = await this.findByIdentity(params.source, params.sourceKey, params.jobKey);
    const entity =
      existing ??
      this.repository.create({
        tenantId,
        source: params.source,
        sourceKey: params.sourceKey,
        jobKey: params.jobKey,
      });

    entity.lastStartedAt = params.lastStartedAt;
    entity.lastFinishedAt = params.lastFinishedAt;
    entity.lastError = params.lastError;

    return await this.repository.save(entity);
  }
}
