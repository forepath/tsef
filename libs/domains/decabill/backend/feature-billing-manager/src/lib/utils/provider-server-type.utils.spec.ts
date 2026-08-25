import {
  assertServerTypeAllowed,
  effectiveSchemaSupportsServerTypeSelection,
  normalizeAllowedServerTypes,
  normalizeServerTypeByProvider,
  providerConfigSchemaSupportsServerTypeSelection,
  resolveDefaultServerTypeForProvider,
  stripServerTypeByProviderFromConfig,
  stripServerTypeFromRequestedConfig,
} from '../utils/provider-server-type.utils';

describe('provider-server-type.utils', () => {
  const schemaWithServerType = { basePriceFromField: 'serverType', properties: {} };

  it('providerConfigSchemaSupportsServerTypeSelection returns true when basePriceFromField is serverType', () => {
    expect(providerConfigSchemaSupportsServerTypeSelection(schemaWithServerType)).toBe(true);
  });

  it('effectiveSchemaSupportsServerTypeSelection falls back to provider schema', () => {
    expect(effectiveSchemaSupportsServerTypeSelection({}, schemaWithServerType)).toBe(true);
  });

  it('stripServerTypeFromRequestedConfig removes serverType', () => {
    expect(stripServerTypeFromRequestedConfig({ serverType: 'cx11', region: 'fsn1' })).toEqual({ region: 'fsn1' });
  });

  it('assertServerTypeAllowed rejects unknown types', () => {
    expect(assertServerTypeAllowed('cx22', ['cx11'])).toBe('serverType "cx22" is not allowed for this plan');
  });

  it('assertServerTypeAllowed accepts allowed types', () => {
    expect(assertServerTypeAllowed('cx11', ['cx11', 'cx22'])).toBeNull();
  });

  it('normalizeAllowedServerTypes deduplicates and trims', () => {
    expect(normalizeAllowedServerTypes([' cx11 ', 'cx11', '', 'cx22', 1])).toEqual(['cx11', 'cx22']);
  });

  it('resolveDefaultServerTypeForProvider prefers per-provider map', () => {
    expect(
      resolveDefaultServerTypeForProvider(
        {
          serverType: 'cx11',
          serverTypeByProvider: { hetzner: 'cx21', 'digital-ocean': 's-1vcpu-1gb' },
        },
        'digital-ocean',
      ),
    ).toBe('s-1vcpu-1gb');
  });

  it('resolveDefaultServerTypeForProvider falls back to top-level serverType', () => {
    expect(resolveDefaultServerTypeForProvider({ serverType: 'cx11' }, 'hetzner')).toBe('cx11');
  });

  it('normalizeServerTypeByProvider and stripServerTypeByProviderFromConfig', () => {
    expect(normalizeServerTypeByProvider({ hetzner: ' cx11 ', '': 'x', do: 1 })).toEqual({ hetzner: 'cx11' });

    const config: Record<string, unknown> = {
      serverType: 'cx11',
      serverTypeByProvider: { hetzner: 'cx11' },
    };

    stripServerTypeByProviderFromConfig(config);
    expect(config).toEqual({ serverType: 'cx11' });
  });
});
