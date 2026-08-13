import { CloudInitModuleRegistryService, type CloudInitConfigModule } from './cloud-init-module-registry.service';

describe('CloudInitModuleRegistryService', () => {
  it('registers and retrieves modules by config key', () => {
    const registry = new CloudInitModuleRegistryService();
    const module: CloudInitConfigModule = {
      key: 'my-app',
      displayName: 'My App',
      serviceTabs: [{ id: 'status', label: 'Status', order: 20 }],
    };

    registry.register(module);

    expect(registry.has('my-app')).toBe(true);
    expect(registry.get('my-app')).toBe(module);
    expect(registry.list()).toEqual([module]);
  });
});
