import {
  collectPlanProductEnvFields,
  getObjectSchemaPropertyKeys,
  getSchemaPropertyType,
  humanizeConfigFieldKey,
  isObjectSchemaProperty,
  isSensitiveConfigFieldKey,
  getProductProviderConfigKeys,
  getServerProviderConfigKeys,
} from './provider-config-schema.utils';

describe('providerConfigSchemaUtils', () => {
  const schema = {
    serverType: { scope: 'server' as const },
    location: { scope: 'server' as const },
    authenticationMethod: {
      scope: 'product' as const,
      productServices: ['agenstra-controller', 'agenstra-manager'] as const,
    },
    git: { scope: 'product' as const, productServices: ['agenstra-manager'] as const },
    disableSignup: { scope: 'product' as const, productServices: ['agenstra-controller'] as const },
  };

  it('returns only server keys for provider defaults', () => {
    expect(getServerProviderConfigKeys(schema, Object.keys(schema))).toEqual(['serverType', 'location']);
  });

  it('returns product keys required by selected integrated services', () => {
    expect(getProductProviderConfigKeys(schema, Object.keys(schema), ['agenstra-controller'])).toEqual([
      'authenticationMethod',
      'disableSignup',
    ]);
    expect(getProductProviderConfigKeys(schema, Object.keys(schema), ['agenstra-manager'])).toEqual([
      'authenticationMethod',
      'git',
    ]);
  });

  it('maps legacy productServices aliases when filtering product keys', () => {
    const legacySchema = {
      ...schema,
      git: { scope: 'product' as const, productServices: ['manager'] as const },
    };

    expect(getProductProviderConfigKeys(legacySchema, Object.keys(legacySchema), ['agenstra-manager'])).toEqual([
      'authenticationMethod',
      'git',
    ]);
  });

  it('detects object schema properties and nested keys', () => {
    const smtp = {
      type: 'object',
      properties: {
        host: { type: 'string' },
        port: { type: 'number' },
      },
    };

    expect(isObjectSchemaProperty(smtp)).toBe(true);
    expect(getObjectSchemaPropertyKeys(smtp)).toEqual(['host', 'port']);
    expect(getSchemaPropertyType({ type: 'boolean' })).toBe('boolean');
  });

  it('humanizes config field labels', () => {
    expect(humanizeConfigFieldKey('smtp')).toBe('SMTP');
    expect(humanizeConfigFieldKey('authenticationMethod')).toBe('Authentication method');
    expect(humanizeConfigFieldKey('commitAuthorEmail')).toBe('Commit author email');
  });

  it('detects sensitive config field keys', () => {
    expect(isSensitiveConfigFieldKey('staticApiKey')).toBe(true);
    expect(isSensitiveConfigFieldKey('smtp.password')).toBe(true);
    expect(isSensitiveConfigFieldKey('host')).toBe(false);
  });

  it('collects custom env fields excluding random defaults', () => {
    expect(
      collectPlanProductEnvFields(
        [
          {
            id: 'cfg-1',
            name: 'WordPress',
            environmentVariables: [
              { key: 'DB_PASSWORD', label: 'DB password', useRandomDefault: true },
              { key: 'SITE_URL', label: 'Site URL' },
            ],
          },
        ],
        ['cfg-1'],
      ),
    ).toEqual([
      {
        key: 'SITE_URL',
        label: 'Site URL',
        description: null,
        configName: 'WordPress',
      },
    ]);
  });
});
