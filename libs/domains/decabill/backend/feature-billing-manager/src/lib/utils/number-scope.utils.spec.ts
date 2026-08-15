import { SHARED_NUMBER_SCOPE, TENANTS_SHARED_NUMBERS_ENV } from '@forepath/shared/backend';

import { resolveNumberScopeKey } from './number-scope.utils';

jest.mock('./tenant-query.utils', () => ({
  getRequiredTenantId: () => 'acme',
}));

describe('resolveNumberScopeKey', () => {
  const original = process.env[TENANTS_SHARED_NUMBERS_ENV];

  afterEach(() => {
    if (original === undefined) {
      delete process.env[TENANTS_SHARED_NUMBERS_ENV];
    } else {
      process.env[TENANTS_SHARED_NUMBERS_ENV] = original;
    }
  });

  it('returns shared scope by default', () => {
    delete process.env[TENANTS_SHARED_NUMBERS_ENV];

    expect(resolveNumberScopeKey()).toBe(SHARED_NUMBER_SCOPE);
  });

  it('returns current tenant when TENANTS_SHARED_NUMBERS is false', () => {
    process.env[TENANTS_SHARED_NUMBERS_ENV] = 'false';

    expect(resolveNumberScopeKey()).toBe('acme');
  });
});
