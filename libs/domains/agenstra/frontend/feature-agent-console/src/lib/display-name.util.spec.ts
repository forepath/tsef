import { getUnavailableDisplayLabel, resolveNamedDisplayLabel } from './display-name.util';

describe('display-name.util', () => {
  it('resolveNamedDisplayLabel_PrefersFirstNonEmptyCandidate', () => {
    expect(resolveNamedDisplayLabel('  Alpha  ', 'beta')).toBe('Alpha');
  });

  it('resolveNamedDisplayLabel_ReturnsUnavailableWhenAllEmpty', () => {
    expect(resolveNamedDisplayLabel(undefined, null, '  ')).toBe(getUnavailableDisplayLabel());
  });
});
