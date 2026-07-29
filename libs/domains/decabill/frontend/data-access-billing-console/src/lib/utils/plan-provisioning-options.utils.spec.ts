import {
  buildProvisioningOptionsFromKeys,
  DEFAULT_INTEGRATED_PROVISIONING_OPTION_KEYS,
  encodeProvisioningOptionKey,
  integratedProvisioningServiceLabel,
  parsePlanProvisioningOptions,
  parseProvisioningOptionKey,
  planProvisioningOptionKeysFromDefaults,
} from './plan-provisioning-options.utils';

describe('planProvisioningOptionsUtils', () => {
  it('exposes default integrated option keys', () => {
    expect(DEFAULT_INTEGRATED_PROVISIONING_OPTION_KEYS).toEqual([
      'integrated:agenstra-controller',
      'integrated:agenstra-manager',
    ]);
  });

  it('integratedProvisioningServiceLabel returns Agenstra stack names', () => {
    expect(integratedProvisioningServiceLabel('agenstra-controller')).toBe('Agenstra Controller');
    expect(integratedProvisioningServiceLabel('agenstra-manager')).toBe('Agenstra Manager');
  });

  it('encodes integrated and custom option keys', () => {
    expect(encodeProvisioningOptionKey({ type: 'integrated', service: 'agenstra-controller' })).toBe(
      'integrated:agenstra-controller',
    );
    expect(encodeProvisioningOptionKey({ type: 'custom', cloudInitConfigId: 'cfg-1' })).toBe('custom:cfg-1');
  });

  it('parses plan defaults with provisioningOptions only', () => {
    expect(
      parsePlanProvisioningOptions({
        provisioningOptions: [
          { type: 'integrated', service: 'agenstra-manager' },
          { type: 'custom', cloudInitConfigId: 'cfg-1' },
        ],
      }),
    ).toEqual([
      { type: 'integrated', service: 'agenstra-manager' },
      { type: 'custom', cloudInitConfigId: 'cfg-1' },
    ]);
    expect(
      parsePlanProvisioningOptions({
        service: 'custom',
        cloudInitConfigId: 'cfg-legacy',
      }),
    ).toEqual([]);
  });

  it('builds keys from defaults and round-trips selected keys', () => {
    const defaults = {
      provisioningOptions: [{ type: 'custom', cloudInitConfigId: 'cfg-legacy' }],
    };

    expect(planProvisioningOptionKeysFromDefaults(defaults)).toEqual(['custom:cfg-legacy']);
    expect(buildProvisioningOptionsFromKeys(['integrated:agenstra-controller', 'custom:cfg-1'])).toEqual([
      { type: 'integrated', service: 'agenstra-controller' },
      { type: 'custom', cloudInitConfigId: 'cfg-1' },
    ]);
  });

  it('infers legacy integrated service keys when provisioningOptions are absent', () => {
    expect(planProvisioningOptionKeysFromDefaults({ service: 'agenstra-manager' })).toEqual([
      'integrated:agenstra-manager',
    ]);
    expect(planProvisioningOptionKeysFromDefaults({ service: 'manager' })).toEqual(['integrated:agenstra-manager']);
    expect(planProvisioningOptionKeysFromDefaults({ service: 'controller' })).toEqual([
      'integrated:agenstra-controller',
    ]);
    expect(planProvisioningOptionKeysFromDefaults({ service: 'custom', cloudInitConfigId: 'cfg-legacy' })).toEqual([
      'custom:cfg-legacy',
    ]);
    expect(planProvisioningOptionKeysFromDefaults({ region: 'fsn1' })).toEqual(['integrated:agenstra-controller']);
  });

  it('maps legacy integrated option keys to canonical service ids', () => {
    expect(parseProvisioningOptionKey('integrated:controller')).toEqual({
      type: 'integrated',
      service: 'agenstra-controller',
    });
    expect(parseProvisioningOptionKey('integrated:manager')).toEqual({
      type: 'integrated',
      service: 'agenstra-manager',
    });
    expect(
      parsePlanProvisioningOptions({
        provisioningOptions: [{ type: 'integrated', service: 'controller' }],
      }),
    ).toEqual([{ type: 'integrated', service: 'agenstra-controller' }]);
  });

  it('parses invalid provisioning option keys safely', () => {
    expect(parseProvisioningOptionKey('')).toBeNull();
    expect(parseProvisioningOptionKey('integrated:invalid')).toBeNull();
    expect(buildProvisioningOptionsFromKeys(['integrated:agenstra-controller', 'bad-key', 'custom:cfg-1'])).toEqual([
      { type: 'integrated', service: 'agenstra-controller' },
      { type: 'custom', cloudInitConfigId: 'cfg-1' },
    ]);
  });
});
