import { parseConfiguredTenants, runWithTenantId } from '@forepath/shared/backend/util-http-context';
import { isOtelEffectivelyEnabled, resolveOtelRuntimeConfig, setGauge } from '@forepath/shared/backend/util-otel';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { InvoiceStatus, OPEN_OVERDUE_INVOICE_STATUSES } from '../constants/invoice-status.constants';
import { SubscriptionStatus } from '../entities/subscription.entity';
import { ProjectStatus, ProjectTicketStatus } from '../projects/entities/project.enums';
import { ProjectTicketsRepository } from '../projects/repositories/project-tickets.repository';
import { ProjectTimeEntriesRepository } from '../projects/repositories/project-time-entries.repository';
import { ProjectsRepository } from '../projects/repositories/projects.repository';
import { InvoicesRepository } from '../repositories/invoices.repository';
import { OpenPositionsRepository } from '../repositories/open-positions.repository';
import { SubscriptionsRepository } from '../repositories/subscriptions.repository';

import { InvoiceCreationService } from './invoice-creation.service';

const METER_NAME = 'forepath.decabill';
const POLL_INTERVAL_MS = 60_000;

@Injectable()
export class BillingMetricsCollectorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BillingMetricsCollectorService.name);
  private intervalHandle: NodeJS.Timeout | undefined;

  constructor(
    private readonly invoicesRepository: InvoicesRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly openPositionsRepository: OpenPositionsRepository,
    private readonly invoiceCreationService: InvoiceCreationService,
    private readonly projectsRepository: ProjectsRepository,
    private readonly projectTicketsRepository: ProjectTicketsRepository,
    private readonly projectTimeEntriesRepository: ProjectTimeEntriesRepository,
  ) {}

  onModuleInit(): void {
    const config = resolveOtelRuntimeConfig(process.env, 'decabill-billing-manager');

    if (!isOtelEffectivelyEnabled(config)) {
      return;
    }

    void this.collectMetrics();
    this.intervalHandle = setInterval(() => {
      void this.collectMetrics();
    }, POLL_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = undefined;
    }
  }

  private async collectMetrics(): Promise<void> {
    const tenants = parseConfiguredTenants();

    for (const tenantId of tenants) {
      try {
        await runWithTenantId(tenantId, async () => {
          for (const status of OPEN_OVERDUE_INVOICE_STATUSES) {
            const count = await this.invoicesRepository.countByStatus(status);

            setGauge(METER_NAME, 'decabill.invoices.open', count, {
              tenant_id: tenantId,
              status,
            });
          }

          const overdueCount = await this.invoicesRepository.countByStatus(InvoiceStatus.OVERDUE);

          setGauge(METER_NAME, 'decabill.invoices.overdue', overdueCount, {
            tenant_id: tenantId,
          });

          const openOverdue = await this.invoicesRepository.findGlobalOpenOverdueSummary();

          setGauge(METER_NAME, 'decabill.invoices.open_total', openOverdue.totalBalance, {
            tenant_id: tenantId,
          });

          const userIdsWithUnbilled = await this.openPositionsRepository.findDistinctUserIdsWithUnbilled();
          let unbilledTotal = 0;

          for (const userId of userIdsWithUnbilled) {
            unbilledTotal += await this.invoiceCreationService.getUnbilledTotalForUser(userId);
          }

          unbilledTotal = Math.round(unbilledTotal * 100) / 100;

          setGauge(METER_NAME, 'decabill.open_positions.unbilled_total', unbilledTotal, {
            tenant_id: tenantId,
          });
          setGauge(METER_NAME, 'decabill.open_positions.unbilled_users', userIdsWithUnbilled.length, {
            tenant_id: tenantId,
          });

          const activeSubscriptions = await this.subscriptionsRepository.countByStatus(SubscriptionStatus.ACTIVE);

          setGauge(METER_NAME, 'decabill.subscriptions.active', activeSubscriptions, {
            tenant_id: tenantId,
          });

          for (const status of Object.values(ProjectStatus)) {
            const count = await this.projectsRepository.countByStatus(status);

            setGauge(METER_NAME, 'decabill.projects', count, {
              tenant_id: tenantId,
              status,
            });
          }

          for (const status of Object.values(ProjectTicketStatus)) {
            const count = await this.projectTicketsRepository.countByStatus(status);

            setGauge(METER_NAME, 'decabill.project_tickets', count, {
              tenant_id: tenantId,
              status,
            });
          }

          const unbilledMinutes = await this.projectTimeEntriesRepository.sumUnbilledDurationMinutes();

          setGauge(METER_NAME, 'decabill.project_time.unbilled_minutes', unbilledMinutes, {
            tenant_id: tenantId,
          });
        });
      } catch (error) {
        this.logger.warn(`Failed to collect billing OTEL metrics for tenant ${tenantId}: ${(error as Error).message}`);
      }
    }
  }
}
