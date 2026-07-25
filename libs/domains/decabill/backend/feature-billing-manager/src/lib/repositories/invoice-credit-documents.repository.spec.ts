import { QueryFailedError } from 'typeorm';

import { InvoiceCreditDocumentsRepository } from './invoice-credit-documents.repository';

describe('InvoiceCreditDocumentsRepository', () => {
  const mockQueryBuilder = {
    innerJoin: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getCount: jest.fn(),
    getMany: jest.fn(),
    getOne: jest.fn(),
  };
  const mockRepository = {
    find: jest.fn(),
    create: jest.fn((dto) => dto),
    save: jest.fn(async (entity) => entity),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };
  const repository = new InvoiceCreditDocumentsRepository(mockRepository as never);

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  it('existsAuthorizedByPdfStorageKey returns true when a tenant-scoped row exists', async () => {
    mockQueryBuilder.getCount.mockResolvedValue(2);

    await expect(repository.existsAuthorizedByPdfStorageKey('credit.pdf')).resolves.toBe(true);
    expect(mockQueryBuilder.where).toHaveBeenCalledWith('credit.pdf_storage_key = :storageKey', {
      storageKey: 'credit.pdf',
    });
  });

  it('existsAuthorizedByPdfStorageKey returns false when missing', async () => {
    mockQueryBuilder.getCount.mockResolvedValue(0);

    await expect(repository.existsAuthorizedByPdfStorageKey('missing.pdf')).resolves.toBe(false);
  });

  it('createUniqueBySourceRef returns existing row on unique violation', async () => {
    const dto = {
      invoiceId: 'inv-1',
      documentNumber: 'INV-1-C1',
      creditNet: 10,
      creditGross: 10,
      pdfStorageKey: 'credit.pdf',
      reason: 'config_change',
      withdrawnAt: new Date('2026-03-15T12:00:00.000Z'),
      sourceRef: 'config_change:change-1',
    };
    const existing = { id: 'credit-1', ...dto, createdAt: new Date() };

    mockRepository.save.mockRejectedValue(new QueryFailedError('INSERT', [], { code: '23505' } as never));
    mockQueryBuilder.getOne.mockResolvedValue(existing);

    const result = await repository.createUniqueBySourceRef(dto);

    expect(result).toEqual({ entity: existing, created: false });
    expect(mockQueryBuilder.where).toHaveBeenCalledWith('credit.source_ref = :sourceRef', {
      sourceRef: 'config_change:change-1',
    });
  });
});
