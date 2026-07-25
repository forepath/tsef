import { runWithTenantId } from '@forepath/shared/backend';
import { Injectable, Logger } from '@nestjs/common';

import { BillingEmailPublisher } from '../email/billing-email.publisher';
import { BillingNotificationPublisher } from '../notifications/billing-notification.publisher';

import { ServicePlanPriceRecalcService } from './service-plan-price-recalc.service';

@Injectable()
export class PriceRecalcJobHandler {
  private readonly logger = new Logger(PriceRecalcJobHandler.name);

  constructor(
    private readonly servicePlanPriceRecalcService: ServicePlanPriceRecalcService,
    private readonly billingEmailPublisher: BillingEmailPublisher,
    private readonly billingNotificationPublisher: BillingNotificationPublisher,
  ) {}

  async processTenant(tenantId: string, runDate?: string): Promise<void> {
    const effectiveRunDate = runDate?.trim() || this.resolveRunDate(new Date());
    const changedAt = new Date();

    await runWithTenantId(tenantId, async () => {
      const result = await this.servicePlanPriceRecalcService.processTenant(effectiveRunDate, changedAt);
      const withdrawalPeriodDays = this.servicePlanPriceRecalcService.getWithdrawalPeriodDays();

      for (const planEvent of result.planEvents) {
        this.billingNotificationPublisher.publishServicePlanPriceRecalculated(
          {
            id: planEvent.planId,
            name: planEvent.planName,
          },
          {
            runDate: planEvent.runDate,
            oldPeriodPriceNet: planEvent.oldPeriodPriceNet,
            newPeriodPriceNet: planEvent.newPeriodPriceNet,
            subscriptionsAffected: planEvent.subscriptionsAffected,
          },
        );
      }

      for (const [userId, migrations] of Object.entries(result.migrationsByUserId)) {
        try {
          await this.billingEmailPublisher.publishPriceChangedConsolidated({
            tenantId,
            userId,
            runDate: effectiveRunDate,
            withdrawalPeriodDays,
            changes: migrations.map((migration) => ({
              subscriptionNumber: migration.subscriptionNumber,
              productName: migration.productName,
              oldNet: migration.oldNet,
              oldTax: migration.oldTax,
              oldTotal: migration.oldTotal,
              newNet: migration.newNet,
              newTax: migration.newTax,
              newTotal: migration.newTotal,
            })),
          });
        } catch (error) {
          this.logger.error(
            `Failed to publish consolidated price-change email for user ${userId}: ${(error as Error).message}`,
          );
        }

        for (const migration of migrations) {
          try {
            this.billingNotificationPublisher.publishSubscriptionPriceChanged(
              migration.subscription,
              migration.planBilling,
              {
                runDate: migration.runDate,
                productName: migration.productName,
                oldNet: migration.oldNet,
                oldTax: migration.oldTax,
                oldTotal: migration.oldTotal,
                newNet: migration.newNet,
                newTax: migration.newTax,
                newTotal: migration.newTotal,
              },
            );
          } catch (error) {
            this.logger.error(
              `Failed to publish subscription price-change webhook for subscription ${migration.subscription.id}: ${(error as Error).message}`,
            );
          }
        }
      }
    });
  }

  private resolveRunDate(reference: Date): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: process.env.BILLING_PRICE_RECALC_TIMEZONE ?? 'Europe/Berlin',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(reference);
  }
}
