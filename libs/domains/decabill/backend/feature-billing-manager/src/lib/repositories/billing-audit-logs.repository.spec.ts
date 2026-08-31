import { runWithTenantId } from '@forepath/shared/backend';

import { BillingAuditLogsRepository } from './billing-audit-logs.repository';

describe('BillingAuditLogsRepository', () => {
  const typeOrmRepo = {
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const repository = new BillingAuditLogsRepository(typeOrmRepo as never);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('findByInvoiceId returns paginated items', async () => {
    const items = [{ id: 'log-1', invoiceId: 'inv-1' }];

    typeOrmRepo.findAndCount.mockResolvedValue([items, 1]);

    const result = await runWithTenantId('default', () => repository.findByInvoiceId('inv-1', 10, 0));

    expect(result).toEqual({ items, total: 1 });
    expect(typeOrmRepo.findAndCount).toHaveBeenCalledWith({
      where: { invoiceId: 'inv-1', tenantId: 'default' },
      order: { createdAt: 'DESC' },
      take: 10,
      skip: 0,
    });
  });

  it('findBySupplierInvoiceId queries context JSON', async () => {
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[{ id: 'log-2' }], 1]),
    };

    typeOrmRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await runWithTenantId('default', () => repository.findBySupplierInvoiceId('sinv-1', 20, 0));

    expect(result).toEqual({ items: [{ id: 'log-2' }], total: 1 });
    expect(qb.andWhere).toHaveBeenCalledWith(`log.context->>'supplierInvoiceId' = :supplierInvoiceId`, {
      supplierInvoiceId: 'sinv-1',
    });
  });
});
