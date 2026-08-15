import { SHARED_NUMBER_SCOPE, TENANTS_SHARED_NUMBERS_ENV } from '@forepath/shared/backend';

import { SubscriptionNumberSequencesRepository } from './subscription-number-sequences.repository';

describe('SubscriptionNumberSequencesRepository', () => {
  const originalSharedNumbers = process.env[TENANTS_SHARED_NUMBERS_ENV];

  afterEach(() => {
    if (originalSharedNumbers === undefined) {
      delete process.env[TENANTS_SHARED_NUMBERS_ENV];
    } else {
      process.env[TENANTS_SHARED_NUMBERS_ENV] = originalSharedNumbers;
    }
  });

  function createRepository(query: jest.Mock): SubscriptionNumberSequencesRepository {
    const mockRepository = {
      manager: {
        transaction: jest.fn(async (callback) => callback({ query })),
      },
    };

    return new SubscriptionNumberSequencesRepository(mockRepository as never);
  }

  it('allocates next shared subscription number by default', async () => {
    delete process.env[TENANTS_SHARED_NUMBERS_ENV];

    const query = jest.fn().mockResolvedValue([{ last_value: 1 }]);
    const repository = createRepository(query);
    const result = await repository.nextSubscriptionNumber();

    expect(result).toEqual({ number: 'SUB-000001', numberScope: SHARED_NUMBER_SCOPE });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT (scope_key)'), [SHARED_NUMBER_SCOPE]);
  });

  it('increments an existing shared sequence row', async () => {
    delete process.env[TENANTS_SHARED_NUMBERS_ENV];

    const query = jest.fn().mockResolvedValue([{ last_value: 42 }]);
    const repository = createRepository(query);

    await expect(repository.nextSubscriptionNumber()).resolves.toEqual({
      number: 'SUB-000042',
      numberScope: SHARED_NUMBER_SCOPE,
    });
  });

  it('uses tenant scope when TENANTS_SHARED_NUMBERS is false', async () => {
    process.env[TENANTS_SHARED_NUMBERS_ENV] = 'false';

    const query = jest.fn().mockResolvedValue([{ last_value: 1 }]);
    const repository = createRepository(query);
    const result = await repository.nextSubscriptionNumber();

    expect(result).toEqual({ number: 'SUB-000001', numberScope: 'default' });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT (scope_key)'), ['default']);
  });
});
