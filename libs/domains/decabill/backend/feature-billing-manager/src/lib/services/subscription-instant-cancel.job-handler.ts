import { Injectable, Logger } from '@nestjs/common';

import { SubscriptionsRepository } from '../repositories/subscriptions.repository';

import { SubscriptionTeardownService } from './subscription-teardown.service';

@Injectable()
export class SubscriptionInstantCancelJobHandler {
  private readonly logger = new Logger(SubscriptionInstantCancelJobHandler.name);
  private readonly batchSize = parseInt(process.env.INSTANT_CANCEL_SCHEDULER_BATCH_SIZE ?? '100', 10);

  constructor(
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly subscriptionTeardownService: SubscriptionTeardownService,
  ) {}

  async findPendingInstantCancelIds(): Promise<string[]> {
    const now = new Date();
    const pending = await this.subscriptionsRepository.findDueForInstantCancel(now, this.batchSize);

    return pending.map((subscription) => subscription.id);
  }

  async processSubscriptionInstantCancel(subscriptionId: string): Promise<void> {
    await this.subscriptionTeardownService.processInstantCancel(subscriptionId);

    this.logger.log(`Instant-canceled subscription ${subscriptionId}`);
  }
}
