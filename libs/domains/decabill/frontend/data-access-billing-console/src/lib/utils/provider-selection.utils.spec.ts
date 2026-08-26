import {
  normalizeAllowedProviders,
  providersAreCompatible,
  resolveCompatibilityGroup,
} from './provider-selection.utils';

describe('provider-selection.utils', () => {
  describe('resolveCompatibilityGroup', () => {
    it('uses configured group when present', () => {
      expect(resolveCompatibilityGroup({ id: 'hetzner', compatibilityGroup: 'host-cloud-init' })).toBe(
        'host-cloud-init',
      );
    });

    it('falls back to self scope when group missing or blank', () => {
      expect(resolveCompatibilityGroup({ id: 'custom' })).toBe('self:custom');
      expect(resolveCompatibilityGroup({ id: 'custom', compatibilityGroup: '  ' })).toBe('self:custom');
    });
  });

  describe('providersAreCompatible', () => {
    it('matches same group', () => {
      expect(
        providersAreCompatible(
          { id: 'hetzner', compatibilityGroup: 'host-cloud-init' },
          { id: 'digital-ocean', compatibilityGroup: 'host-cloud-init' },
        ),
      ).toBe(true);
    });

    it('rejects different self scopes', () => {
      expect(providersAreCompatible({ id: 'a' }, { id: 'b' })).toBe(false);
    });

    it('treats identical ids without group as compatible', () => {
      expect(providersAreCompatible({ id: 'a' }, { id: 'a' })).toBe(true);
    });
  });

  describe('normalizeAllowedProviders', () => {
    it('deduplicates and preserves order', () => {
      expect(normalizeAllowedProviders([' hetzner ', 'digital-ocean', 'hetzner', '', 1])).toEqual([
        'hetzner',
        'digital-ocean',
      ]);
    });

    it('returns empty array for non-arrays', () => {
      expect(normalizeAllowedProviders(null)).toEqual([]);
      expect(normalizeAllowedProviders(undefined)).toEqual([]);
      expect(normalizeAllowedProviders('hetzner')).toEqual([]);
    });
  });
});
