import { buildJobId, defaultRemoveOnComplete, defaultRemoveOnFail } from '@forepath/shared/backend';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

import { BILLING_QUEUE_NAME } from './billing-queue.constants';
import type { PlanPriceMigrateEnqueuePort } from './plan-price-migrate-enqueue.token';
import { PlanPriceMigrateJobName, type PlanPriceMigrateUnitPayload } from './plan-price-migrate.payload';

@Injectable()
export class PlanPriceMigrateEnqueueAdapter implements PlanPriceMigrateEnqueuePort {
  constructor(@InjectQueue(BILLING_QUEUE_NAME) private readonly billingQueue: Queue) {}

  async enqueueUnit(payload: PlanPriceMigrateUnitPayload): Promise<void> {
    await this.billingQueue.add(PlanPriceMigrateJobName.UNIT, payload, {
      jobId: buildJobId('plan-price-migrate', payload.changeId),
      removeOnComplete: defaultRemoveOnComplete,
      removeOnFail: defaultRemoveOnFail,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }
}
