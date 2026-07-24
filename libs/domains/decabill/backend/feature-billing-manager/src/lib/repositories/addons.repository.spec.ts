import { NotFoundException } from '@nestjs/common';

import { AddonsRepository } from './addons.repository';

describe('AddonsRepository', () => {
  const typeorm = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const repository = new AddonsRepository(typeorm as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('findByIdOrThrow returns entity or throws', async () => {
    typeorm.findOne.mockResolvedValueOnce({ id: 'a-1' });
    await expect(repository.findByIdOrThrow('a-1')).resolves.toEqual({ id: 'a-1' });
    expect(typeorm.findOne).toHaveBeenCalledWith({ where: { id: 'a-1', tenantId: 'default' } });

    typeorm.findOne.mockResolvedValueOnce(null);
    await expect(repository.findByIdOrThrow('missing')).rejects.toThrow(NotFoundException);
  });

  it('findById and findByKey delegate to typeorm', async () => {
    typeorm.findOne.mockResolvedValueOnce({ id: 'a-1' });
    await expect(repository.findById('a-1')).resolves.toEqual({ id: 'a-1' });

    typeorm.findOne.mockResolvedValueOnce({ key: 'av' });
    await expect(repository.findByKey('av')).resolves.toEqual({ key: 'av' });
  });

  it('findByIds returns empty for empty input and queries otherwise', async () => {
    await expect(repository.findByIds([])).resolves.toEqual([]);
    expect(typeorm.find).not.toHaveBeenCalled();

    typeorm.find.mockResolvedValueOnce([{ id: 'a-1' }]);
    await expect(repository.findByIds(['a-1'])).resolves.toEqual([{ id: 'a-1' }]);
    expect(typeorm.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 'default' }),
      }),
    );
  });

  it('findAll and findActive apply pagination', async () => {
    typeorm.find.mockResolvedValue([]);
    await repository.findAll(5, 10);
    expect(typeorm.find).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5, skip: 10, order: { createdAt: 'DESC' } }),
    );

    await repository.findActive(20, 0);
    expect(typeorm.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'default', isActive: true },
        take: 20,
        skip: 0,
        order: { name: 'ASC' },
      }),
    );
  });

  it('create ignores incoming tenantId and saves', async () => {
    typeorm.create.mockImplementation((dto) => dto);
    typeorm.save.mockImplementation(async (entity) => entity);

    const result = await repository.create({ key: 'av', name: 'AV', tenantId: 'evil' } as never);

    expect(typeorm.create).toHaveBeenCalledWith(expect.objectContaining({ key: 'av', tenantId: 'default' }));
    expect(result.tenantId).toBe('default');
  });

  it('update merges and saves; delete removes after load', async () => {
    typeorm.findOne.mockResolvedValue({ id: 'a-1', name: 'Old', tenantId: 'default' });
    typeorm.save.mockImplementation(async (entity) => entity);
    typeorm.remove.mockResolvedValue(undefined);

    const updated = await repository.update('a-1', { name: 'New', tenantId: 'evil' } as never);
    expect(updated.name).toBe('New');
    expect(updated.tenantId).toBe('default');

    await repository.delete('a-1');
    expect(typeorm.remove).toHaveBeenCalledWith(expect.objectContaining({ id: 'a-1' }));
  });
});
