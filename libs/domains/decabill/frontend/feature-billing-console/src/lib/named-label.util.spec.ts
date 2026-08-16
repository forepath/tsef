import { getUnavailableLabel, resolveNamedLabel } from './named-label.util';

describe('named-label.util', () => {
  it('prefers the first non-empty candidate', () => {
    expect(resolveNamedLabel('  Alpha  ', 'beta')).toBe('Alpha');
  });

  it('returns unavailable when all candidates are empty', () => {
    expect(resolveNamedLabel(undefined, null, '  ')).toBe(getUnavailableLabel());
  });

  it('never returns a raw id when only blank names are provided', () => {
    const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

    expect(resolveNamedLabel(undefined)).not.toBe(uuid);
    expect(resolveNamedLabel('')).toBe(getUnavailableLabel());
  });
});
