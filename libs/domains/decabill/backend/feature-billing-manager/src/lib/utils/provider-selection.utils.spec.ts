import {
  HOST_CLOUD_INIT_COMPATIBILITY_GROUP,
  allowedProvidersEqual,
  assertProviderAllowed,
  assertProvidersCompatible,
  normalizeAllowedProviders,
  providersAreCompatible,
  resolveCompatibilityGroup,
  resolveEffectiveProvider,
  resolvePlanAllowedProviders,
  resolvePrimaryProvider,
  resolveServiceTypeAllowedProviders,
  resolveItemProvider,
  stripProviderFromRequestedConfig,
} from './provider-selection.utils';

describe('provider-selection.utils', () => {
  describe('resolveCompatibilityGroup', () => {
    it('uses configured group when present', () => {
      expect(
        resolveCompatibilityGroup({ id: 'hetzner', compatibilityGroup: HOST_CLOUD_INIT_COMPATIBILITY_GROUP }),
      ).toBe(HOST_CLOUD_INIT_COMPATIBILITY_GROUP);
    });

    it('falls back to self scope when group missing', () => {
      expect(resolveCompatibilityGroup({ id: 'custom' })).toBe('self:custom');
      expect(resolveCompatibilityGroup({ id: 'custom', compatibilityGroup: '  ' })).toBe('self:custom');
    });
  });

  describe('providersAreCompatible', () => {
    it('matches same group', () => {
      expect(
        providersAreCompatible(
          { id: 'hetzner', compatibilityGroup: HOST_CLOUD_INIT_COMPATIBILITY_GROUP },
          { id: 'digital-ocean', compatibilityGroup: HOST_CLOUD_INIT_COMPATIBILITY_GROUP },
        ),
      ).toBe(true);
    });

    it('rejects different self scopes', () => {
      expect(providersAreCompatible({ id: 'a' }, { id: 'b' })).toBe(false);
    });
  });

  describe('normalizeAllowedProviders / resolvePrimaryProvider', () => {
    it('deduplicates and preserves order', () => {
      expect(normalizeAllowedProviders([' hetzner ', 'digital-ocean', 'hetzner', '', 1])).toEqual([
        'hetzner',
        'digital-ocean',
      ]);
    });

    it('returns null primary for empty list', () => {
      expect(resolvePrimaryProvider([])).toBeNull();
      expect(resolvePrimaryProvider(['hetzner', 'digital-ocean'])).toBe('hetzner');
    });
  });

  describe('resolveServiceTypeAllowedProviders', () => {
    it('prefers allowedProviders and falls back to provider', () => {
      expect(
        resolveServiceTypeAllowedProviders({
          provider: 'hetzner',
          allowedProviders: ['digital-ocean', 'hetzner'],
        }),
      ).toEqual(['digital-ocean', 'hetzner']);
      expect(resolveServiceTypeAllowedProviders({ provider: 'hetzner', allowedProviders: [] })).toEqual(['hetzner']);
      expect(resolveServiceTypeAllowedProviders({ provider: null, allowedProviders: [] })).toEqual([]);
    });
  });

  describe('resolvePlanAllowedProviders / resolveEffectiveProvider', () => {
    const serviceType = { provider: 'hetzner', allowedProviders: ['hetzner', 'digital-ocean'] };

    it('uses pinned plan provider when customer selection is off', () => {
      expect(
        resolvePlanAllowedProviders(
          { allowCustomerProviderSelection: false, allowedProviders: ['digital-ocean'] },
          serviceType,
        ),
      ).toEqual(['digital-ocean']);
      expect(
        resolveEffectiveProvider(
          serviceType,
          { allowCustomerProviderSelection: false, allowedProviders: ['digital-ocean'] },
          {},
        ),
      ).toBe('digital-ocean');
    });

    it('falls back to type primary when customer selection is off and plan has no pin', () => {
      expect(resolvePlanAllowedProviders({ allowCustomerProviderSelection: false }, serviceType)).toEqual(['hetzner']);
      expect(resolveEffectiveProvider(serviceType, { allowCustomerProviderSelection: false }, {})).toBe('hetzner');
    });

    it('intersects plan allowlist when customer selection is on', () => {
      expect(
        resolvePlanAllowedProviders(
          { allowCustomerProviderSelection: true, allowedProviders: ['digital-ocean', 'unknown'] },
          serviceType,
        ),
      ).toEqual(['digital-ocean']);
    });

    it('honors requested provider when allowed', () => {
      expect(
        resolveEffectiveProvider(
          serviceType,
          { allowCustomerProviderSelection: true, allowedProviders: ['hetzner', 'digital-ocean'] },
          { provider: 'digital-ocean' },
        ),
      ).toBe('digital-ocean');
    });

    it('returns null when requested provider is not allowed', () => {
      expect(
        resolveEffectiveProvider(
          serviceType,
          { allowCustomerProviderSelection: true, allowedProviders: ['hetzner'] },
          { provider: 'digital-ocean' },
        ),
      ).toBeNull();
    });
  });

  describe('resolveItemProvider', () => {
    it('prefers configSnapshot.provider over service type primary', () => {
      expect(
        resolveItemProvider({
          configSnapshot: { provider: 'digital-ocean' },
          serviceType: { provider: 'hetzner', allowedProviders: ['hetzner', 'digital-ocean'] },
        }),
      ).toBe('digital-ocean');
    });

    it('falls back to service type allowlist primary when snapshot has no provider', () => {
      expect(
        resolveItemProvider({
          configSnapshot: { serverType: 'cx11' },
          serviceType: { provider: 'hetzner', allowedProviders: ['digital-ocean', 'hetzner'] },
        }),
      ).toBe('digital-ocean');
      expect(resolveItemProvider({ serviceType: { provider: 'hetzner', allowedProviders: [] } })).toBe('hetzner');
      expect(resolveItemProvider({ configSnapshot: {}, serviceType: null })).toBeNull();
    });
  });

  describe('strip / assert', () => {
    it('strips provider from requested config', () => {
      expect(stripProviderFromRequestedConfig({ provider: 'hetzner', serverType: 'cx11' })).toEqual({
        serverType: 'cx11',
      });
    });

    it('asserts allowed provider', () => {
      expect(assertProviderAllowed('hetzner', ['hetzner'])).toBeNull();
      expect(assertProviderAllowed('digital-ocean', ['hetzner'])).toContain('not allowed');
      expect(assertProviderAllowed('', ['hetzner'])).toContain('required');
    });
  });

  describe('assertProvidersCompatible', () => {
    const lookup = (id: string) => {
      if (id === 'hetzner' || id === 'digital-ocean') {
        return { id, compatibilityGroup: HOST_CLOUD_INIT_COMPATIBILITY_GROUP };
      }

      if (id === 'other') {
        return { id, compatibilityGroup: 'other-group' };
      }

      return undefined;
    };

    it('accepts compatible set', () => {
      expect(assertProvidersCompatible(['hetzner', 'digital-ocean'], lookup)).toBeNull();
    });

    it('rejects unknown and incompatible', () => {
      expect(assertProvidersCompatible(['missing'], lookup)).toContain('Unknown');
      expect(assertProvidersCompatible(['hetzner', 'other'], lookup)).toContain('compatibility group');
    });
  });

  describe('allowedProvidersEqual', () => {
    it('compares normalized lists', () => {
      expect(allowedProvidersEqual(['a', 'b'], [' a ', 'b'])).toBe(true);
      expect(allowedProvidersEqual(['a', 'b'], ['b', 'a'])).toBe(false);
    });
  });
});
