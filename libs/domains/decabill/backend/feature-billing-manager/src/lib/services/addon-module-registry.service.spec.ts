import { AddonModuleRegistryService, type BillingAddonModule } from './addon-module-registry.service';

describe('AddonModuleRegistryService', () => {
  const createModule = (key: string): BillingAddonModule => ({
    key,
    displayName: key.toUpperCase(),
    configFields: [{ key: 'TOKEN', label: 'Token', showInOrderForm: true }],
    provision: jest.fn().mockResolvedValue(undefined),
    teardown: jest.fn().mockResolvedValue(undefined),
  });

  it('registers, retrieves, and lists modules', () => {
    const registry = new AddonModuleRegistryService();
    const antivirus = createModule('antivirus');
    const backup = createModule('backup');

    registry.register(antivirus);
    registry.register(backup);

    expect(registry.has('antivirus')).toBe(true);
    expect(registry.has('missing')).toBe(false);
    expect(registry.get('antivirus')).toBe(antivirus);
    expect(registry.get('missing')).toBeUndefined();
    expect(registry.list()).toEqual([antivirus, backup]);
  });

  it('overwrites an existing module key on re-register', () => {
    const registry = new AddonModuleRegistryService();
    const first = createModule('antivirus');
    const second = createModule('antivirus');

    registry.register(first);
    registry.register(second);

    expect(registry.get('antivirus')).toBe(second);
    expect(registry.list()).toHaveLength(1);
  });
});
