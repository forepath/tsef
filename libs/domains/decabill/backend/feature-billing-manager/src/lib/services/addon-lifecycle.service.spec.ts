import { AddonLifecycleService } from './addon-lifecycle.service';

describe('AddonLifecycleService', () => {
  const subscriptionAddonsRepository = {
    createMany: jest.fn(),
    findBySubscriptionId: jest.fn(),
    save: jest.fn(),
  };
  const addonModuleRegistry = {
    get: jest.fn(),
  };
  const billingNotificationPublisher = {
    publishAddon: jest.fn(),
  };
  const billingEmailPublisher = {
    publishAddonActivated: jest.fn(),
    publishAddonDeactivated: jest.fn(),
    publishAddonProvisionFailed: jest.fn(),
    publishAddonTeardownFailed: jest.fn(),
  };

  const service = new AddonLifecycleService(
    subscriptionAddonsRepository as never,
    addonModuleRegistry as never,
    billingNotificationPublisher as never,
    billingEmailPublisher as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('appends cloud-init scripts after primary user-data', () => {
    const result = service.appendScriptsToUserData('#!/bin/bash\necho base', ['echo addon']);

    expect(result).toContain('echo base');
    expect(result).toContain('Decabill addon script 1');
    expect(result).toContain('echo addon');
  });

  it('collects only cloud_init_script templates', () => {
    expect(
      service.collectCloudInitScripts([
        { implementationType: 'module', scriptTemplate: 'nope' } as never,
        { implementationType: 'cloud_init_script', scriptTemplate: '  #!/bin/bash\n  ' } as never,
      ]),
    ).toEqual(['#!/bin/bash']);
  });

  it('creates pending rows with resolved config snapshots', async () => {
    subscriptionAddonsRepository.createMany.mockImplementation(async (rows: unknown[]) => rows);

    await service.createPendingSubscriptionAddons({
      subscriptionId: 'sub-1',
      plan: { billingIntervalType: 'month', billingIntervalValue: 1 } as never,
      addonConfigs: { 'a-1': { REGION: 'eu' } },
      addons: [
        {
          id: 'a-1',
          name: 'Script',
          basePrice: '0',
          configSchema: {
            environmentVariables: [
              { key: 'API_KEY', label: 'Key', showInOrderForm: false, hasDefault: true },
              { key: 'REGION', label: 'Region', showInOrderForm: true, hasDefault: false },
            ],
          },
          configDefaultValues: { API_KEY: 'admin' },
        } as never,
      ],
    });

    expect(subscriptionAddonsRepository.createMany).toHaveBeenCalledWith([
      expect.objectContaining({
        configSnapshot: { API_KEY: 'admin', REGION: 'eu' },
      }),
    ]);
  });

  it('interpolates addon scripts from config snapshots', () => {
    const scripts = service.collectInterpolatedCloudInitScripts([
      {
        configSnapshot: { API_KEY: 'secret' },
        addon: {
          implementationType: 'cloud_init_script',
          scriptTemplate: 'export K={{env.API_KEY}}',
          configSchema: {
            environmentVariables: [{ key: 'API_KEY', label: 'Key', showInOrderForm: false, hasDefault: true }],
          },
        },
      } as never,
    ]);

    expect(scripts[0]).toContain('secret');
  });

  it('marks addon active and notifies after successful module provision', async () => {
    const provision = jest.fn().mockResolvedValue(undefined);
    addonModuleRegistry.get.mockReturnValue({ key: 'av', displayName: 'AV', provision, teardown: jest.fn() });
    subscriptionAddonsRepository.findBySubscriptionId.mockResolvedValue([
      {
        id: 'sa-1',
        status: 'pending',
        addon: { id: 'a-1', key: 'av', name: 'AV', implementationType: 'module', moduleKey: 'av' },
      },
    ]);
    subscriptionAddonsRepository.save.mockImplementation(async (row: { status: string }) => row);

    await service.activateAfterProvisioning({
      subscription: { id: 'sub-1', userId: 'u-1' } as never,
      plan: { id: 'p-1', name: 'Pro', billInAdvance: false, billingIntervalType: 'month' } as never,
      item: { id: 'item-1', providerReference: 'srv-1', hostname: 'host' } as never,
      provider: 'hetzner',
    });

    expect(provision).toHaveBeenCalled();
    expect(billingNotificationPublisher.publishAddon).toHaveBeenCalledWith('addon.activated', expect.any(Object));
    expect(billingEmailPublisher.publishAddonActivated).toHaveBeenCalled();
  });

  it('emits provision_failed when module provision throws', async () => {
    addonModuleRegistry.get.mockReturnValue({
      key: 'av',
      displayName: 'AV',
      provision: jest.fn().mockRejectedValue(new Error('boom')),
      teardown: jest.fn(),
    });
    subscriptionAddonsRepository.findBySubscriptionId.mockResolvedValue([
      {
        id: 'sa-1',
        status: 'pending',
        addon: { id: 'a-1', key: 'av', name: 'AV', implementationType: 'module', moduleKey: 'av' },
      },
    ]);
    subscriptionAddonsRepository.save.mockImplementation(async (row: { status: string }) => row);

    await service.activateAfterProvisioning({
      subscription: { id: 'sub-1', userId: 'u-1' } as never,
      plan: { id: 'p-1', name: 'Pro', billInAdvance: false, billingIntervalType: 'month' } as never,
      item: { id: 'item-1' } as never,
      provider: 'hetzner',
    });

    expect(billingNotificationPublisher.publishAddon).toHaveBeenCalledWith(
      'addon.provision_failed',
      expect.objectContaining({ errorMessage: 'boom' }),
    );
  });

  it('returns empty when creating pending addons with no catalog rows', async () => {
    await expect(
      service.createPendingSubscriptionAddons({
        subscriptionId: 'sub-1',
        plan: { billingIntervalType: 'month', billingIntervalValue: 1 } as never,
        addons: [],
      }),
    ).resolves.toEqual([]);
    expect(subscriptionAddonsRepository.createMany).not.toHaveBeenCalled();
  });

  it('lists subscription addons via repository', async () => {
    subscriptionAddonsRepository.findBySubscriptionId.mockResolvedValue([{ id: 'sa-1' }]);
    await expect(service.listForSubscription('sub-1')).resolves.toEqual([{ id: 'sa-1' }]);
  });

  it('leaves user-data unchanged when no scripts are appended', () => {
    expect(service.appendScriptsToUserData('#!/bin/bash\necho base', [])).toBe('#!/bin/bash\necho base');
  });

  it('skips activation when addon relation is missing', async () => {
    subscriptionAddonsRepository.findBySubscriptionId.mockResolvedValue([{ id: 'sa-1', status: 'pending' }]);

    await service.activateAfterProvisioning({
      subscription: { id: 'sub-1' } as never,
      plan: { id: 'p-1', name: 'Pro' } as never,
      item: { id: 'item-1' } as never,
      provider: 'hetzner',
    });

    expect(subscriptionAddonsRepository.save).not.toHaveBeenCalled();
  });

  it('activates cloud_init_script addons without calling module registry', async () => {
    subscriptionAddonsRepository.findBySubscriptionId.mockResolvedValue([
      {
        id: 'sa-1',
        status: 'pending',
        addon: { id: 'a-1', key: 'script', name: 'Script', implementationType: 'cloud_init_script' },
      },
    ]);
    subscriptionAddonsRepository.save.mockImplementation(async (row: { status: string }) => row);

    await service.activateAfterProvisioning({
      subscription: { id: 'sub-1', userId: 'u-1' } as never,
      plan: { id: 'p-1', name: 'Pro', billInAdvance: false, billingIntervalType: 'month' } as never,
      item: { id: 'item-1' } as never,
      provider: 'hetzner',
    });

    expect(addonModuleRegistry.get).not.toHaveBeenCalled();
    expect(billingNotificationPublisher.publishAddon).toHaveBeenCalledWith('addon.activated', expect.any(Object));
  });

  it('tears down module addons and notifies deactivation', async () => {
    const teardown = jest.fn().mockResolvedValue(undefined);
    addonModuleRegistry.get.mockReturnValue({ key: 'av', displayName: 'AV', provision: jest.fn(), teardown });
    subscriptionAddonsRepository.findBySubscriptionId.mockResolvedValue([
      {
        id: 'sa-1',
        status: 'active',
        addon: { id: 'a-1', key: 'av', name: 'AV', implementationType: 'module', moduleKey: 'av' },
      },
    ]);
    subscriptionAddonsRepository.save.mockImplementation(async (row: { status: string }) => row);

    await service.teardownForSubscription({
      subscription: { id: 'sub-1', userId: 'u-1' } as never,
      plan: { id: 'p-1', name: 'Pro' } as never,
      items: [{ id: 'item-1', providerReference: 'srv-1', hostname: 'host' } as never],
      providerByItemId: new Map([['item-1', 'hetzner']]),
    });

    expect(teardown).toHaveBeenCalled();
    expect(billingNotificationPublisher.publishAddon).toHaveBeenCalledWith('addon.deactivated', expect.any(Object));
    expect(billingEmailPublisher.publishAddonDeactivated).toHaveBeenCalled();
  });

  it('emits teardown_failed when module teardown throws', async () => {
    addonModuleRegistry.get.mockReturnValue({
      key: 'av',
      displayName: 'AV',
      provision: jest.fn(),
      teardown: jest.fn().mockRejectedValue(new Error('teardown boom')),
    });
    subscriptionAddonsRepository.findBySubscriptionId.mockResolvedValue([
      {
        id: 'sa-1',
        status: 'active',
        addon: { id: 'a-1', key: 'av', name: 'AV', implementationType: 'module', moduleKey: 'av' },
      },
    ]);
    subscriptionAddonsRepository.save.mockImplementation(async (row: { status: string }) => row);

    await service.teardownForSubscription({
      subscription: { id: 'sub-1', userId: 'u-1' } as never,
      plan: { id: 'p-1', name: 'Pro' } as never,
      items: [{ id: 'item-1' } as never],
      providerByItemId: new Map([['item-1', 'hetzner']]),
    });

    expect(billingNotificationPublisher.publishAddon).toHaveBeenCalledWith(
      'addon.teardown_failed',
      expect.objectContaining({ errorMessage: 'teardown boom' }),
    );
    expect(billingEmailPublisher.publishAddonTeardownFailed).toHaveBeenCalled();
  });

  it('stringifies non-string config snapshot values when interpolating scripts', () => {
    const scripts = service.collectInterpolatedCloudInitScripts([
      {
        configSnapshot: { PORT: 8080, FLAG: true, SKIP: null },
        addon: {
          implementationType: 'cloud_init_script',
          scriptTemplate: 'port={{env.PORT}} flag={{env.FLAG}}',
          configSchema: {
            environmentVariables: [
              { key: 'PORT', label: 'Port', showInOrderForm: true },
              { key: 'FLAG', label: 'Flag', showInOrderForm: true },
            ],
          },
        },
      } as never,
    ]);

    expect(scripts[0]).toContain('8080');
    expect(scripts[0]).toContain('true');
  });
});
