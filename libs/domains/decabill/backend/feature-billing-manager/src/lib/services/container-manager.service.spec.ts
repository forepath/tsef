import { BadRequestException, NotFoundException } from '@nestjs/common';

import { ContainerManagerService } from './container-manager.service';

describe('ContainerManagerService', () => {
  const subscriptionsRepository = {
    findByIdOrThrow: jest.fn(),
  };
  const subscriptionItemsRepository = {
    findByIdAndSubscriptionId: jest.fn(),
  };
  const subscriptionAddonsRepository = {
    findActiveBySubscriptionId: jest.fn(),
  };
  const servicePlansRepository = {
    findByIdOrThrow: jest.fn(),
  };
  const sshExecutor = {
    waitUntilReachable: jest.fn().mockResolvedValue(undefined),
    exec: jest.fn(),
  };
  const addonModuleRegistry = {
    has: jest.fn().mockReturnValue(true),
  };
  const billingNotificationPublisher = {
    publish: jest.fn(),
  };

  const service = new ContainerManagerService(
    subscriptionsRepository as never,
    subscriptionItemsRepository as never,
    subscriptionAddonsRepository as never,
    servicePlansRepository as never,
    sshExecutor as never,
    addonModuleRegistry as never,
    billingNotificationPublisher as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    addonModuleRegistry.has.mockReturnValue(true);
    subscriptionsRepository.findByIdOrThrow.mockResolvedValue({
      id: 'sub-1',
      userId: 'user-1',
      planId: 'plan-1',
      status: 'active',
    });
    subscriptionAddonsRepository.findActiveBySubscriptionId.mockResolvedValue([
      {
        status: 'active',
        addon: {
          id: 'addon-1',
          key: 'container-manager',
          moduleKey: 'container-manager',
          implementationType: 'module',
          name: 'Container Manager',
        },
      },
    ]);
    subscriptionItemsRepository.findByIdAndSubscriptionId.mockResolvedValue({
      id: 'item-1',
      sshPrivateKey: 'KEY',
      providerReference: 'srv-1',
      provisioningStatus: 'active',
      serverInfoSnapshot: { publicIp: '1.2.3.4' },
    });
  });

  it('lists containers via SSH docker commands', async () => {
    sshExecutor.exec
      .mockResolvedValueOnce({
        code: 0,
        stdout: `${JSON.stringify({ ID: 'abcdef123456', Names: 'web', Image: 'nginx', State: 'running', Status: 'Up 1 minute' })}\n`,
        stderr: '',
      })
      .mockResolvedValueOnce({
        code: 0,
        stdout: `${JSON.stringify({ Name: 'web', CPUPerc: '1.5%', MemPerc: '10%', MemUsage: '10MiB / 100MiB', BlockIO: '1kB / 2kB', NetIO: '3kB / 4kB' })}\n`,
        stderr: '',
      });

    const result = await service.listContainers('sub-1', 'item-1', { userId: 'user-1' });

    expect(result.containers).toHaveLength(1);
    expect(result.containers[0].name).toBe('web');
    expect(result.containers[0].stats?.cpuPercent).toBe(1.5);
    expect(service.getCachedSummary('item-1')?.containerCount).toBe(1);
  });

  it('rejects when Container Manager addon is not active', async () => {
    subscriptionAddonsRepository.findActiveBySubscriptionId.mockResolvedValue([]);

    await expect(service.listContainers('sub-1', 'item-1', { userId: 'user-1' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects ownership mismatch for customers', async () => {
    await expect(service.listContainers('sub-1', 'item-1', { userId: 'other' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects canceled subscriptions', async () => {
    subscriptionsRepository.findByIdOrThrow.mockResolvedValue({
      id: 'sub-1',
      userId: 'user-1',
      planId: 'plan-1',
      status: 'canceled',
    });

    await expect(service.listContainers('sub-1', 'item-1', { userId: 'user-1' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects non-active provisioning items', async () => {
    subscriptionItemsRepository.findByIdAndSubscriptionId.mockResolvedValue({
      id: 'item-1',
      sshPrivateKey: 'KEY',
      providerReference: 'srv-1',
      provisioningStatus: 'pending',
      serverInfoSnapshot: { publicIp: '1.2.3.4' },
    });

    await expect(service.listContainers('sub-1', 'item-1', { userId: 'user-1' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects invalid public IP values', async () => {
    subscriptionItemsRepository.findByIdAndSubscriptionId.mockResolvedValue({
      id: 'item-1',
      sshPrivateKey: 'KEY',
      providerReference: 'srv-1',
      provisioningStatus: 'active',
      serverInfoSnapshot: { publicIp: 'evil.example;rm -rf /' },
    });

    await expect(service.listContainers('sub-1', 'item-1', { userId: 'user-1' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects invalid container ids for stats history', async () => {
    await expect(
      service.getStatsHistory('sub-1', 'item-1', 'web;rm -rf /', { userId: 'user-1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps collection failures to BadRequest and publishes notification', async () => {
    sshExecutor.exec.mockRejectedValue(new Error('boom'));
    servicePlansRepository.findByIdOrThrow.mockResolvedValue({ id: 'plan-1', name: 'Plan' });

    await expect(service.listContainers('sub-1', 'item-1', { userId: 'user-1' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(billingNotificationPublisher.publish).toHaveBeenCalledWith(
      'addon.container_manager.collection_failed',
      expect.objectContaining({ subscriptionId: 'sub-1', itemId: 'item-1' }),
      'user-1',
    );
  });
});
