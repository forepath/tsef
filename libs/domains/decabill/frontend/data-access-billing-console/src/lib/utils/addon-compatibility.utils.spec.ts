import { isAddonCompatibleWithProvider } from './addon-compatibility.utils';

describe('addon-compatibility.utils', () => {
  it('treats empty compatibleProviders as all providers', () => {
    expect(isAddonCompatibleWithProvider({ compatibleProviders: [] }, 'hetzner')).toBe(true);
  });

  it('matches when provider is in the allowlist', () => {
    expect(isAddonCompatibleWithProvider({ compatibleProviders: ['hetzner'] }, 'hetzner')).toBe(true);
  });

  it('rejects when provider is not in the allowlist', () => {
    expect(isAddonCompatibleWithProvider({ compatibleProviders: ['hetzner'] }, 'digital-ocean')).toBe(false);
  });
});
