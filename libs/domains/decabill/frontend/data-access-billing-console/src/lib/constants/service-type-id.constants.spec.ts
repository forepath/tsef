import { isNoneServiceTypeId } from './service-type-id.constants';

describe('service-type-id.constants (frontend)', () => {
  it('detects null/undefined/blank as none', () => {
    expect(isNoneServiceTypeId(null)).toBe(true);
    expect(isNoneServiceTypeId(undefined)).toBe(true);
    expect(isNoneServiceTypeId('')).toBe(true);
    expect(isNoneServiceTypeId('  ')).toBe(true);
    expect(isNoneServiceTypeId('none')).toBe(false);
    expect(isNoneServiceTypeId('22222222-2222-4222-8222-222222222222')).toBe(false);
  });
});
