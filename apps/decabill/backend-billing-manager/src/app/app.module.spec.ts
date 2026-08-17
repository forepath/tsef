import { BillingModule, ContainerManagerContributorModule } from '@forepath/decabill/backend';

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

  it('includes first-party Container Manager for API and worker registrations', () => {
    const app = AppModule.register([]);
    const billing = findBillingDynamicModule(app.imports);

    expect(billing?.imports).toContain(ContainerManagerContributorModule);

    const queue = BillingQueueModule.register();
    const queueBilling = findBillingDynamicModule(queue.imports);

    expect(queueBilling?.imports).toContain(ContainerManagerContributorModule);
  });
});
