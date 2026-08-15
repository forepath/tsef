import { IntegratedStackRegistryService, type IntegratedStackModule } from './integrated-stack-registry.service';

describe('IntegratedStackRegistryService', () => {
  it('registers and retrieves modules by key', () => {
    const registry = new IntegratedStackRegistryService();
    const module: IntegratedStackModule = {
      key: 'agenstra-controller',
      displayName: 'Agenstra Controller',
      serviceTabs: [{ id: 'ops', label: 'Ops', order: 10 }],
    };

    registry.register(module);

    expect(registry.has('agenstra-controller')).toBe(true);
    expect(registry.get('agenstra-controller')).toBe(module);
    expect(registry.list()).toEqual([module]);
  });
});
