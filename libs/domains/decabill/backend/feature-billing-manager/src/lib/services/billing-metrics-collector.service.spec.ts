const setGauge = jest.fn();
const isOtelEffectivelyEnabled = jest.fn(() => true);
const resolveOtelRuntimeConfig = jest.fn(() => ({ enabled: true }));
const parseConfiguredTenants = jest.fn(() => ['tenant-a']);
const runWithTenantId = jest.fn(async (_tenantId: string, fn: () => Promise<void>) => fn());

jest.mock('@forepath/shared/backend/util-otel', () => ({
  isOtelEffectivelyEnabled,
  resolveOtelRuntimeConfig,
  setGauge,
}));

jest.mock('@forepath/shared/backend/util-http-context', () => ({
  parseConfiguredTenants,
  runWithTenantId,
}));

jest.mock('../repositories/invoices.repository', () => ({
  InvoicesRepository: class InvoicesRepository {},
}));

jest.mock('../repositories/subscriptions.repository', () => ({
  SubscriptionsRepository: class SubscriptionsRepository {},
}));

jest.mock('../repositories/open-positions.repository', () => ({
  OpenPositionsRepository: class OpenPositionsRepository {},
}));

jest.mock('./invoice-creation.service', () => ({
  InvoiceCreationService: class InvoiceCreationService {},
}));

jest.mock('../projects/repositories/projects.repository', () => ({
  ProjectsRepository: class ProjectsRepository {},
}));

jest.mock('../projects/repositories/project-tickets.repository', () => ({
  ProjectTicketsRepository: class ProjectTicketsRepository {},
}));

jest.mock('../projects/repositories/project-time-entries.repository', () => ({
  ProjectTimeEntriesRepository: class ProjectTimeEntriesRepository {},
}));

jest.mock('../constants/invoice-status.constants', () => ({
  InvoiceStatus: { OVERDUE: 'overdue' },
  OPEN_OVERDUE_INVOICE_STATUSES: ['issued', 'partially_paid', 'overdue'],
}));

jest.mock('../entities/subscription.entity', () => ({
  SubscriptionStatus: { ACTIVE: 'active' },
}));

jest.mock('../projects/entities/project.enums', () => ({
  ProjectStatus: { ACTIVE: 'active', ARCHIVED: 'archived' },
  ProjectTicketStatus: {
    DRAFT: 'draft',
    TODO: 'todo',
    IN_PROGRESS: 'in_progress',
    PROTOTYPE: 'prototype',
    DONE: 'done',
    CLOSED: 'closed',
  },
}));

import { BillingMetricsCollectorService } from './billing-metrics-collector.service';

describe('BillingMetricsCollectorService', () => {
  const invoicesRepository = {
    countByStatus: jest.fn(),
    findGlobalOpenOverdueSummary: jest.fn(),
  };
  const subscriptionsRepository = {
    countByStatus: jest.fn(),
  };
  const openPositionsRepository = {
    findDistinctUserIdsWithUnbilled: jest.fn(),
  };
  const invoiceCreationService = {
    getUnbilledTotalForUser: jest.fn(),
  };
  const projectsRepository = {
    countByStatus: jest.fn(),
  };
  const projectTicketsRepository = {
    countByStatus: jest.fn(),
  };
  const projectTimeEntriesRepository = {
    sumUnbilledDurationMinutes: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    isOtelEffectivelyEnabled.mockReturnValue(true);
    resolveOtelRuntimeConfig.mockReturnValue({ enabled: true });
    parseConfiguredTenants.mockReturnValue(['tenant-a']);
    runWithTenantId.mockImplementation(async (_tenantId: string, fn: () => Promise<void>) => fn());
  });

  it('sets open invoice, unbilled, project, and subscription gauges per tenant when OTEL is enabled', async () => {
    invoicesRepository.countByStatus.mockImplementation(async (status: string) => {
      if (status === 'overdue') {
        return 2;
      }

      return 1;
    });
    invoicesRepository.findGlobalOpenOverdueSummary.mockResolvedValue({ count: 4, totalBalance: 250.5 });
    openPositionsRepository.findDistinctUserIdsWithUnbilled.mockResolvedValue(['user-1', 'user-2']);
    invoiceCreationService.getUnbilledTotalForUser.mockImplementation(async (id: string) =>
      id === 'user-1' ? 10.125 : 5.5,
    );
    subscriptionsRepository.countByStatus.mockResolvedValue(5);
    projectsRepository.countByStatus.mockImplementation(async (status: string) => (status === 'active' ? 3 : 1));
    projectTicketsRepository.countByStatus.mockResolvedValue(2);
    projectTimeEntriesRepository.sumUnbilledDurationMinutes.mockResolvedValue(90);

    const service = new BillingMetricsCollectorService(
      invoicesRepository as never,
      subscriptionsRepository as never,
      openPositionsRepository as never,
      invoiceCreationService as never,
      projectsRepository as never,
      projectTicketsRepository as never,
      projectTimeEntriesRepository as never,
    );

    await (service as unknown as { collectMetrics: () => Promise<void> }).collectMetrics();

    for (const status of ['issued', 'partially_paid', 'overdue']) {
      expect(setGauge).toHaveBeenCalledWith('forepath.decabill', 'decabill.invoices.open', expect.any(Number), {
        tenant_id: 'tenant-a',
        status,
      });
    }

    expect(setGauge).toHaveBeenCalledWith('forepath.decabill', 'decabill.invoices.overdue', 2, {
      tenant_id: 'tenant-a',
    });
    expect(setGauge).toHaveBeenCalledWith('forepath.decabill', 'decabill.invoices.open_total', 250.5, {
      tenant_id: 'tenant-a',
    });
    expect(setGauge).toHaveBeenCalledWith('forepath.decabill', 'decabill.open_positions.unbilled_total', 15.63, {
      tenant_id: 'tenant-a',
    });
    expect(setGauge).toHaveBeenCalledWith('forepath.decabill', 'decabill.open_positions.unbilled_users', 2, {
      tenant_id: 'tenant-a',
    });
    expect(setGauge).toHaveBeenCalledWith('forepath.decabill', 'decabill.subscriptions.active', 5, {
      tenant_id: 'tenant-a',
    });
    expect(setGauge).toHaveBeenCalledWith('forepath.decabill', 'decabill.projects', 3, {
      tenant_id: 'tenant-a',
      status: 'active',
    });
    expect(setGauge).toHaveBeenCalledWith('forepath.decabill', 'decabill.projects', 1, {
      tenant_id: 'tenant-a',
      status: 'archived',
    });
    expect(setGauge).toHaveBeenCalledWith('forepath.decabill', 'decabill.project_tickets', 2, {
      tenant_id: 'tenant-a',
      status: 'todo',
    });
    expect(setGauge).toHaveBeenCalledWith('forepath.decabill', 'decabill.project_time.unbilled_minutes', 90, {
      tenant_id: 'tenant-a',
    });
    expect(subscriptionsRepository.countByStatus).toHaveBeenCalledWith('active');
    expect(invoiceCreationService.getUnbilledTotalForUser).toHaveBeenCalledWith('user-1');
    expect(invoiceCreationService.getUnbilledTotalForUser).toHaveBeenCalledWith('user-2');
  });
});
