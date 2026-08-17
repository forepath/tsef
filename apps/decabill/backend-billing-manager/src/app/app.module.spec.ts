import {
  AgenstraControllerContributorModule,
  AgenstraManagerContributorModule,
  BillingModule,
  ContainerManagerContributorModule,
  DecabillBillingContributorModule,
} from '@forepath/decabill/backend';

import { BillingQueueModule } from '../queue/billing-queue.module';
import { AppModule } from './app.module';

function findBillingDynamicModule(
  imports: unknown[] | undefined,
): { module: unknown; imports?: unknown[] } | undefined {
  return (imports ?? []).find(
    (entry): entry is { module: unknown; imports?: unknown[] } =>
      typeof entry === 'object' &&
      entry !== null &&
      'module' in entry &&
      (entry as { module: unknown }).module === BillingModule,
  );
}

describe('AppModule.register', () => {
  afterEach(() => {
    BillingModule.withContributors([]);
  });

  it('includes first-party Container Manager and integrated stack modules for API and worker registrations', () => {
    const app = AppModule.register([]);
    const billing = findBillingDynamicModule(app.imports);

    expect(billing?.imports).toEqual(
      expect.arrayContaining([
        ContainerManagerContributorModule,
        AgenstraControllerContributorModule,
        AgenstraManagerContributorModule,
        DecabillBillingContributorModule,
      ]),
    );

    const queue = BillingQueueModule.register();
    const queueBilling = findBillingDynamicModule(queue.imports);

    expect(queueBilling?.imports).toEqual(
      expect.arrayContaining([
        ContainerManagerContributorModule,
        AgenstraControllerContributorModule,
        AgenstraManagerContributorModule,
        DecabillBillingContributorModule,
      ]),
    );
  });
});
