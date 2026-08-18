import { createBuiltinAddonModules } from './builtin-addon-modules';

describe('createBuiltinAddonModules', () => {
  it('registers collect-stats when a collect service is provided', () => {
    const collectService = { collectTenant: jest.fn().mockResolvedValue(undefined) };
    const modules = createBuiltinAddonModules(collectService as never);
    const cm = modules.find((module) => module.key === 'container-manager');

    expect(cm?.jobs).toEqual([
      expect.objectContaining({
        key: 'collect-stats',
        intervalMs: 60_000,
      }),
    ]);
  });

  it('omits jobs when no collect service is provided', () => {
    const modules = createBuiltinAddonModules();
    const cm = modules.find((module) => module.key === 'container-manager');

    expect(cm?.jobs).toEqual([]);
  });
});
