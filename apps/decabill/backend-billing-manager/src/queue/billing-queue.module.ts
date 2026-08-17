import { BillingModule } from '@forepath/decabill/backend';
import { SharedQueueModule, shouldRegisterRepeatableJobs, shouldRunQueueWorkers } from '@forepath/shared/backend';
import { DynamicModule, Module } from '@nestjs/common';

import { BillingQueueRegistrarService } from './billing-queue-registrar.service';
import { BILLING_QUEUE_NAME } from './job-registry';
import { BillingJobsProcessor } from './processors/billing-jobs.processor';

@Module({})
export class BillingQueueModule {
  static register(): DynamicModule {
    return {
      module: BillingQueueModule,
      imports: [
        SharedQueueModule.forRoot({
          queueNames: [BILLING_QUEUE_NAME],
        }),
        BillingModule.withContributors(),
      ],
      providers: [
        ...(shouldRunQueueWorkers() ? [BillingJobsProcessor] : []),
        ...(shouldRegisterRepeatableJobs() ? [BillingQueueRegistrarService] : []),
      ],
    };
  }
}
