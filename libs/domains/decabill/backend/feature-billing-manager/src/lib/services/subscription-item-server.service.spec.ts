import { BadRequestException, ConflictException } from '@nestjs/common';

import { ProvisioningStatus } from '../entities/subscription-item.entity';
import { SubscriptionItemServerService } from './subscription-item-server.service';

describe('SubscriptionItemServerService', () => {
  const subscriptionService = {
    getSubscription: jest.fn().mockResolvedValue({ id: 'sub-1', userId: 'user-1', planId: 'plan-1', number: 'S-1' }),
  };
  const subscriptionItemsRepository = {
    findBySubscription: jest.fn(),
    findByIdAndSubscriptionId: jest.fn(),
    claimSshAccessGranted: jest.fn(),
  };
  const servicePlansRepository = {
    findByIdOrThrow: jest.fn().mockResolvedValue({ id: 'plan-1', name: 'Starter' }),
  };
  const billingNotificationPublisher = {
    publishSshAccessGranted: jest.fn(),
  };
  const billingEmailPublisher = {
    publishSshAccessGranted: jest.fn().mockResolvedValue(undefined),
  };
  const service = new SubscriptionItemServerService(
    subscriptionService as never,
    subscriptionItemsRepository as never,
    {} as never,
    {} as never,
    servicePlansRepository as never,
    billingNotificationPublisher as never,
    billingEmailPublisher as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listItems', () => {
    it('maps custom service and sshAccessGranted from config snapshot', async () => {
      subscriptionItemsRepository.findBySubscription.mockResolvedValue([
        {
          id: 'item-1',
          subscriptionId: 'sub-1',
          serviceTypeId: 'st-1',
          serviceType: { name: 'Hetzner' },
          provisioningStatus: ProvisioningStatus.ACTIVE,
          hostname: 'host1',
          configSnapshot: { service: 'custom', cloudInitConfigId: 'cfg-1' },
          sshAccessGrantedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]);

      const items = await service.listItems('sub-1', 'user-1');

      expect(items[0]?.service).toBe('custom');
      expect(items[0]?.serviceTypeName).toBe('Hetzner');
      expect(items[0]?.sshAccessGranted).toBe(true);
    });

    it('maps sshAccessGranted false when marker is unset', async () => {
      subscriptionItemsRepository.findBySubscription.mockResolvedValue([
        {
          id: 'item-1',
          subscriptionId: 'sub-1',
          serviceTypeId: 'st-1',
          serviceType: { name: 'DigitalOcean' },
          provisioningStatus: ProvisioningStatus.ACTIVE,
          hostname: 'host1',
          configSnapshot: { service: 'agenstra-controller' },
        },
      ]);

      const items = await service.listItems('sub-1', 'user-1');

      expect(items[0]?.serviceTypeName).toBe('DigitalOcean');
      expect(items[0]?.sshAccessGranted).toBe(false);
    });

    it('maps empty serviceTypeName when relation is missing', async () => {
      subscriptionItemsRepository.findBySubscription.mockResolvedValue([
        {
          id: 'item-1',
          subscriptionId: 'sub-1',
          serviceTypeId: 'st-1',
          provisioningStatus: ProvisioningStatus.ACTIVE,
          hostname: 'host1',
          configSnapshot: { service: 'agenstra-controller' },
        },
      ]);

      const items = await service.listItems('sub-1', 'user-1');

      expect(items[0]?.serviceTypeName).toBe('');
    });

    it('maps null serviceTypeId as null', async () => {
      subscriptionItemsRepository.findBySubscription.mockResolvedValue([
        {
          id: 'item-1',
          subscriptionId: 'sub-1',
          serviceTypeId: null,
          provisioningStatus: ProvisioningStatus.ACTIVE,
          hostname: undefined,
          configSnapshot: {},
        },
      ]);

      const items = await service.listItems('sub-1', 'user-1');

      expect(items[0]?.serviceTypeId).toBeNull();
      expect(items[0]?.serviceTypeName).toBe('');
      expect(items[0]?.service).toBeUndefined();
    });
  });

  describe('getSshAccessKey', () => {
    const provisionedItem = {
      id: 'item-1',
      subscriptionId: 'sub-1',
      providerReference: 'srv-1',
      provisioningStatus: ProvisioningStatus.ACTIVE,
      hostname: 'host1',
      sshPrivateKey: '-----BEGIN OPENSSH PRIVATE KEY-----\ntest\n-----END OPENSSH PRIVATE KEY-----',
    };

    it('returns private key once and publishes notifications', async () => {
      subscriptionItemsRepository.findByIdAndSubscriptionId.mockResolvedValue(provisionedItem);
      subscriptionItemsRepository.claimSshAccessGranted.mockResolvedValue(true);

      const result = await service.getSshAccessKey('sub-1', 'item-1', 'user-1');

      expect(result.privateKey).toContain('BEGIN OPENSSH PRIVATE KEY');
      expect(subscriptionItemsRepository.claimSshAccessGranted).toHaveBeenCalledWith('item-1');
      expect(billingNotificationPublisher.publishSshAccessGranted).toHaveBeenCalledWith(
        expect.objectContaining({
          itemId: 'item-1',
          hostname: 'host1',
        }),
      );
      expect(billingEmailPublisher.publishSshAccessGranted).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'sub-1' }),
        'Starter',
        expect.objectContaining({ itemId: 'item-1', hostname: 'host1' }),
      );
    });

    it('rejects when access was already granted', async () => {
      subscriptionItemsRepository.findByIdAndSubscriptionId.mockResolvedValue(provisionedItem);
      subscriptionItemsRepository.claimSshAccessGranted.mockResolvedValue(false);

      await expect(service.getSshAccessKey('sub-1', 'item-1', 'user-1')).rejects.toBeInstanceOf(ConflictException);
      expect(billingNotificationPublisher.publishSshAccessGranted).not.toHaveBeenCalled();
      expect(billingEmailPublisher.publishSshAccessGranted).not.toHaveBeenCalled();
    });

    it('rejects when SSH key is missing', async () => {
      subscriptionItemsRepository.findByIdAndSubscriptionId.mockResolvedValue({
        ...provisionedItem,
        sshPrivateKey: undefined,
      });

      await expect(service.getSshAccessKey('sub-1', 'item-1', 'user-1')).rejects.toBeInstanceOf(BadRequestException);
      expect(subscriptionItemsRepository.claimSshAccessGranted).not.toHaveBeenCalled();
    });
  });
});
