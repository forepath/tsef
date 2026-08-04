import {
  fromApiServiceTypeId,
  isNoneServiceTypeId,
  isValidApiServiceTypeId,
  parseApiServiceTypeId,
  toApiServiceTypeId,
} from './service-type-id.constants';

describe('service-type-id.constants', () => {
  const uuid = '22222222-2222-4222-8222-222222222222';

  it('isNoneServiceTypeId detects null/undefined/blank', () => {
    expect(isNoneServiceTypeId(null)).toBe(true);
    expect(isNoneServiceTypeId(undefined)).toBe(true);
    expect(isNoneServiceTypeId('')).toBe(true);
    expect(isNoneServiceTypeId('   ')).toBe(true);
    expect(isNoneServiceTypeId(uuid)).toBe(false);
    expect(isNoneServiceTypeId('none')).toBe(false);
  });

  it('toApiServiceTypeId maps unset to null', () => {
    expect(toApiServiceTypeId(null)).toBeNull();
    expect(toApiServiceTypeId(undefined)).toBeNull();
    expect(toApiServiceTypeId('')).toBeNull();
    expect(toApiServiceTypeId(uuid)).toBe(uuid);
  });

  it('fromApiServiceTypeId maps unset to null', () => {
    expect(fromApiServiceTypeId(null)).toBeNull();
    expect(fromApiServiceTypeId(undefined)).toBeNull();
    expect(fromApiServiceTypeId('')).toBeNull();
    expect(fromApiServiceTypeId('  ')).toBeNull();
    expect(fromApiServiceTypeId(uuid)).toBe(uuid);
  });

  it('isValidApiServiceTypeId accepts null/blank and UUID v4 only', () => {
    expect(isValidApiServiceTypeId(null)).toBe(true);
    expect(isValidApiServiceTypeId(undefined)).toBe(true);
    expect(isValidApiServiceTypeId('')).toBe(true);
    expect(isValidApiServiceTypeId(uuid)).toBe(true);
    expect(isValidApiServiceTypeId('none')).toBe(false);
    expect(isValidApiServiceTypeId('11111111-1111-1111-1111-111111111111')).toBe(false);
  });

  it('parseApiServiceTypeId throws on invalid input', () => {
    expect(parseApiServiceTypeId(null)).toBeNull();
    expect(parseApiServiceTypeId(uuid)).toBe(uuid);
    expect(() => parseApiServiceTypeId('none')).toThrow(/UUID or null/);
  });
});
