import {
  effectiveSchemaSupportsLocationSelection,
  getGeographyEnumFromSchema,
  getGeographyFieldKeyFromSchema,
  mirrorGeographyInConfig,
  normalizeGeographyByProvider,
  providerConfigSchemaSupportsLocationSelection,
  readRequestedGeography,
  resolveDefaultGeographyForProvider,
  resolveProvisioningRegion,
  stripGeographyByProviderFromConfig,
  stripGeographyFromRequestedConfig,
} from './provider-location.utils';

describe('provider-location.utils', () => {
  const schemaWithRegion = {
    properties: {
      region: { type: 'string', enum: ['a', 'b'] },
    },
  };
  const schemaWithLocation = {
    properties: {
      location: { type: 'string', enum: ['fsn1'] },
    },
  };

  it('providerConfigSchemaSupportsLocationSelection is true for region with string enum', () => {
    expect(providerConfigSchemaSupportsLocationSelection(schemaWithRegion)).toBe(true);
  });

  it('providerConfigSchemaSupportsLocationSelection is true for location with string enum', () => {
    expect(providerConfigSchemaSupportsLocationSelection(schemaWithLocation)).toBe(true);
  });

  it('providerConfigSchemaSupportsLocationSelection is false without enum', () => {
    expect(
      providerConfigSchemaSupportsLocationSelection({
        properties: { region: { type: 'string' } },
      }),
    ).toBe(false);
  });

  it('getGeographyFieldKeyFromSchema prefers region', () => {
    expect(getGeographyFieldKeyFromSchema(schemaWithRegion)).toBe('region');
    expect(getGeographyFieldKeyFromSchema(schemaWithLocation)).toBe('location');
  });

  it('getGeographyEnumFromSchema returns enum list', () => {
    expect(getGeographyEnumFromSchema(schemaWithRegion)).toEqual(['a', 'b']);
  });

  it('resolveProvisioningRegion reads region or location', () => {
    expect(resolveProvisioningRegion({ region: 'fra1' }, 'digital-ocean')).toBe('fra1');
    expect(resolveProvisioningRegion({ location: 'nbg1' }, 'hetzner')).toBe('nbg1');
    expect(resolveProvisioningRegion({}, 'hetzner')).toBe('fsn1');
    expect(resolveProvisioningRegion({}, 'digital-ocean')).toBe('fra1');
  });

  it('mirrorGeographyInConfig sets both keys', () => {
    const c: Record<string, unknown> = { serverType: 'x' };

    mirrorGeographyInConfig(c, 'fsn1');
    expect(c['region']).toBe('fsn1');
    expect(c['location']).toBe('fsn1');
  });

  it('stripGeographyFromRequestedConfig removes region and location', () => {
    const out = stripGeographyFromRequestedConfig({ region: 'a', location: 'b', x: 1 });

    expect(out).toEqual({ x: 1 });
  });

  it('effectiveSchemaSupportsLocationSelection falls back to provider schema', () => {
    const st = { properties: { region: { type: 'string', enum: ['a'] } } };

    expect(effectiveSchemaSupportsLocationSelection({}, st)).toBe(true);
  });

  it('resolveDefaultGeographyForProvider prefers per-provider map', () => {
    expect(
      resolveDefaultGeographyForProvider(
        {
          location: 'fsn1',
          geographyByProvider: { hetzner: 'nbg1', 'digital-ocean': 'fra1' },
        },
        'digital-ocean',
      ),
    ).toBe('fra1');
  });

  it('normalizeGeographyByProvider and stripGeographyByProviderFromConfig', () => {
    expect(normalizeGeographyByProvider({ hetzner: ' fsn1 ', '': 'x' })).toEqual({ hetzner: 'fsn1' });

    const config: Record<string, unknown> = {
      location: 'fsn1',
      geographyByProvider: { hetzner: 'fsn1' },
    };

    stripGeographyByProviderFromConfig(config);
    expect(config).toEqual({ location: 'fsn1' });
  });

  it('readRequestedGeography prefers region then location', () => {
    expect(readRequestedGeography({ region: 'fra1', location: 'fsn1' })).toBe('fra1');
    expect(readRequestedGeography({ location: 'nbg1' })).toBe('nbg1');
    expect(readRequestedGeography({})).toBe('');
  });
});
