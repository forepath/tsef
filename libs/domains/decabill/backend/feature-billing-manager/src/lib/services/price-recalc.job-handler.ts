import { runWithTenantId } from '@forepath/shared/backend';
import { Injectable, Logger } from '@nestjs/common';

import { BillingEmailPublisher } from '../email/billing-email.publisher';
import { BillingNotificationPublisher } from '../notifications/billing-notification.publisher';
import type { PlanPriceMigrateUnitPayload } from '../queue/plan-price-migrate.payload';

import {
  type PriceRecalcSubscriptionMigration,
  type ServicePlanPriceRecalcResult,
  type ServicePlanPriceRecalcTenantResult,
  ServicePlanPriceRecalcService,
} from './service-plan-price-recalc.service';

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

      await this.publishTenantResult(tenantId, effectiveRunDate, result);
    });
  }

  async processPlanCommercialMigrate(payload: PlanPriceMigrateUnitPayload): Promise<void> {
    const changedAt = new Date();

    await runWithTenantId(payload.tenantId, async () => {
      const result = await this.servicePlanPriceRecalcService.processCommercialPlanUpdate({
        planId: payload.planId,
        changeId: payload.changeId,
        runDate: payload.runDate,
        changedAt,
        previousPricing: payload.previousPricing,
      });

      await this.publishCommercialResult(payload.tenantId, payload.runDate, payload.changeId, result);
    });
  }

  private async publishTenantResult(
    tenantId: string,
    runDate: string,
    result: ServicePlanPriceRecalcTenantResult,
  ): Promise<void> {
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

    await this.publishMigrations(tenantId, runDate, result.migrationsByUserId);
  }

  private async publishCommercialResult(
    tenantId: string,
    runDate: string,
    changeId: string,
    result: ServicePlanPriceRecalcResult,
  ): Promise<void> {
    if (result.migrations.length > 0) {
      this.billingNotificationPublisher.publishServicePlanPriceRecalculated(
        {
          id: result.planId,
          name: result.planName,
        },
        {
          runDate,
          oldPeriodPriceNet: result.oldPeriodPriceNet,
          newPeriodPriceNet: result.newPeriodPriceNet,
          subscriptionsAffected: result.migrations.length,
        },
      );
    }

    await this.publishMigrations(tenantId, `${runDate}:${changeId}`, this.groupMigrationsByUser(result.migrations));
  }

  private async publishMigrations(
    tenantId: string,
    correlationRunKey: string,
    migrationsByUserId: Record<string, PriceRecalcSubscriptionMigration[]>,
  ): Promise<void> {
    const withdrawalPeriodDays = this.servicePlanPriceRecalcService.getWithdrawalPeriodDays();

    for (const [userId, migrations] of Object.entries(migrationsByUserId)) {
      try {
        await this.billingEmailPublisher.publishPriceChangedConsolidated({
          tenantId,
          userId,
          runDate: correlationRunKey,
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
  }

  private groupMigrationsByUser(
    migrations: PriceRecalcSubscriptionMigration[],
  ): Record<string, PriceRecalcSubscriptionMigration[]> {
    const byUser: Record<string, PriceRecalcSubscriptionMigration[]> = {};

    for (const migration of migrations) {
      const list = byUser[migration.userId] ?? [];

      list.push(migration);
      byUser[migration.userId] = list;
    }

    return byUser;
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
