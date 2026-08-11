import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { ProvisioningStatus } from '../entities/subscription-item.entity';
import { SubscriptionItemServerService } from './subscription-item-server.service';

describe('SubscriptionItemServerService', () => {
  const subscriptionService = {
    getSubscription: jest.fn().mockResolvedValue({ id: 'sub-1', userId: 'user-1', planId: 'plan-1', number: 'S-1' }),
  };
  const subscriptionsRepository = {
    findByIdOrThrow: jest.fn().mockResolvedValue({ id: 'sub-1', userId: 'user-1', planId: 'plan-1' }),
  };
  const subscriptionItemsRepository = {
    findBySubscription: jest.fn(),
    findByIdAndSubscriptionId: jest.fn(),
    claimSshAccessGranted: jest.fn(),
    updateDisplayName: jest.fn(),
    updateServerInfoSnapshot: jest.fn(),
  };
  const provisioningService = {
    getServerInfo: jest.fn(),
    startServer: jest.fn(),
    stopServer: jest.fn(),
    restartServer: jest.fn(),
  };
  const cloudflareDnsService = {
    getFqdn: jest.fn((hostname: string) => `${hostname}.example.test`),
  };
  const servicePlansRepository = {
    findByIdOrThrow: jest.fn().mockResolvedValue({ id: 'plan-1', name: 'Starter' }),
  };
  const billingNotificationPublisher = {
    publish: jest.fn(),
    publishSshAccessGranted: jest.fn(),
  };
  const billingEmailPublisher = {
    publishSshAccessGranted: jest.fn().mockResolvedValue(undefined),
  };
  const service = new SubscriptionItemServerService(
    subscriptionService as never,
    subscriptionsRepository as never,
    subscriptionItemsRepository as never,
    provisioningService as never,
    cloudflareDnsService as never,
    servicePlansRepository as never,
    billingNotificationPublisher as never,
    billingEmailPublisher as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listItems', () => {
    it('maps custom service, displayName, and sshAccessGranted from config snapshot', async () => {
      subscriptionItemsRepository.findBySubscription.mockResolvedValue([
        {
          id: 'item-1',
          subscriptionId: 'sub-1',
          serviceTypeId: 'st-1',
          serviceType: { name: 'Hetzner' },
          provisioningStatus: ProvisioningStatus.ACTIVE,
          hostname: 'host1',
          displayName: 'Production',
          configSnapshot: { service: 'custom', cloudInitConfigId: 'cfg-1' },
          sshAccessGrantedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]);

      const items = await service.listItems('sub-1', 'user-1');

      expect(items[0]?.service).toBe('custom');
      expect(items[0]?.serviceTypeName).toBe('Hetzner');
      expect(items[0]?.displayName).toBe('Production');
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
          displayName: null,
          configSnapshot: { service: 'agenstra-controller' },
        },
      ]);

      const items = await service.listItems('sub-1', 'user-1');

      expect(items[0]?.serviceTypeName).toBe('DigitalOcean');
      expect(items[0]?.displayName).toBeNull();
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
      expect(items[0]?.displayName).toBeNull();
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

  describe('getItemDetail', () => {
    const activeItem = {
      id: 'item-1',
      subscriptionId: 'sub-1',
      serviceTypeId: 'st-1',
      serviceType: { name: 'Hetzner', provider: 'hetzner' },
      provisioningStatus: ProvisioningStatus.ACTIVE,
      providerReference: 'srv-1',
      hostname: 'host1',
      displayName: 'Prod',
      configSnapshot: { service: 'agenstra-controller' },
      serverInfoSnapshot: {
        name: 'host1',
        publicIp: '203.0.113.10',
        status: 'running',
      },
    };

    it('returns item detail with cached server info for active provisioned items', async () => {
      subscriptionItemsRepository.findByIdAndSubscriptionId.mockResolvedValue(activeItem);

      const detail = await service.getItemDetail('sub-1', 'item-1', 'user-1');

      expect(detail.id).toBe('item-1');
      expect(detail.displayName).toBe('Prod');
      expect(detail.serverInfo).toEqual(
        expect.objectContaining({
          name: 'host1',
          publicIp: '203.0.113.10',
          status: 'running',
          hostname: 'host1',
          hostnameFqdn: 'host1.example.test',
        }),
      );
    });

    it('rejects removed items without provider reference', async () => {
      subscriptionItemsRepository.findByIdAndSubscriptionId.mockResolvedValue({
        ...activeItem,
        providerReference: undefined,
      });

      await expect(service.getItemDetail('sub-1', 'item-1', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects non-active items', async () => {
      subscriptionItemsRepository.findByIdAndSubscriptionId.mockResolvedValue({
        ...activeItem,
        provisioningStatus: ProvisioningStatus.FAILED,
      });

      await expect(service.getItemDetail('sub-1', 'item-1', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects missing items', async () => {
      subscriptionItemsRepository.findByIdAndSubscriptionId.mockResolvedValue(null);

      await expect(service.getItemDetail('sub-1', 'item-1', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('getItemDetailAsAdmin loads detail without subscription ownership check', async () => {
      const item = {
        id: 'item-1',
        subscriptionId: 'sub-1',
        serviceTypeId: 'st-1',
        serviceType: { name: 'Hetzner' },
        provisioningStatus: ProvisioningStatus.ACTIVE,
        providerReference: 'srv-1',
        hostname: 'host1',
        displayName: 'Production',
        configSnapshot: { service: 'agenstra-controller' },
        serverInfoSnapshot: {
          name: 'server-1',
          publicIp: '1.2.3.4',
          status: 'running',
        },
      };

      subscriptionItemsRepository.findByIdAndSubscriptionId.mockResolvedValue(item);

      const detail = await service.getItemDetailAsAdmin('sub-1', 'item-1');

      expect(subscriptionsRepository.findByIdOrThrow).toHaveBeenCalledWith('sub-1');
      expect(subscriptionService.getSubscription).not.toHaveBeenCalled();
      expect(detail.displayName).toBe('Production');
      expect(detail.serverInfo?.publicIp).toBe('1.2.3.4');
    });
  });

  describe('updateDisplayName', () => {
    const item = {
      id: 'item-1',
      subscriptionId: 'sub-1',
      serviceTypeId: 'st-1',
      serviceType: { name: 'Hetzner' },
      provisioningStatus: ProvisioningStatus.ACTIVE,
      providerReference: 'srv-1',
      configSnapshot: { service: 'agenstra-controller' },
    };

    it('trims and persists display name', async () => {
      subscriptionItemsRepository.findByIdAndSubscriptionId.mockResolvedValue(item);
      subscriptionItemsRepository.updateDisplayName.mockResolvedValue({
        ...item,
        displayName: 'My Service',
      });

      const result = await service.updateDisplayName('sub-1', 'item-1', 'user-1', '  My Service  ');

      expect(subscriptionItemsRepository.updateDisplayName).toHaveBeenCalledWith('item-1', 'My Service');
      expect(result.displayName).toBe('My Service');
      expect(billingNotificationPublisher.publish).toHaveBeenCalledWith('subscription.service.renamed', {
        subscriptionId: 'sub-1',
        itemId: 'item-1',
        displayName: 'My Service',
      });
    });

    it('clears display name for empty strings', async () => {
      subscriptionItemsRepository.findByIdAndSubscriptionId.mockResolvedValue(item);
      subscriptionItemsRepository.updateDisplayName.mockResolvedValue({
        ...item,
        displayName: null,
      });

      const result = await service.updateDisplayName('sub-1', 'item-1', 'user-1', '   ');

      expect(subscriptionItemsRepository.updateDisplayName).toHaveBeenCalledWith('item-1', null);
      expect(result.displayName).toBeNull();
    });

    it('rejects display names longer than 255 characters', async () => {
      subscriptionItemsRepository.findByIdAndSubscriptionId.mockResolvedValue(item);

      await expect(service.updateDisplayName('sub-1', 'item-1', 'user-1', 'x'.repeat(256))).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(subscriptionItemsRepository.updateDisplayName).not.toHaveBeenCalled();
    });

    it('rejects missing items', async () => {
      subscriptionItemsRepository.findByIdAndSubscriptionId.mockResolvedValue(null);

      await expect(service.updateDisplayName('sub-1', 'item-1', 'user-1', 'Name')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rejects removed items without provider reference', async () => {
      subscriptionItemsRepository.findByIdAndSubscriptionId.mockResolvedValue({
        ...item,
        providerReference: undefined,
      });

      await expect(service.updateDisplayName('sub-1', 'item-1', 'user-1', 'Name')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(subscriptionItemsRepository.updateDisplayName).not.toHaveBeenCalled();
    });

    it('rejects non-active items', async () => {
      subscriptionItemsRepository.findByIdAndSubscriptionId.mockResolvedValue({
        ...item,
        provisioningStatus: ProvisioningStatus.FAILED,
      });

      await expect(service.updateDisplayName('sub-1', 'item-1', 'user-1', 'Name')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(subscriptionItemsRepository.updateDisplayName).not.toHaveBeenCalled();
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

  describe('power actions', () => {
    const provisionedItem = {
      id: 'item-1',
      subscriptionId: 'sub-1',
      providerReference: 'srv-1',
      provisioningStatus: ProvisioningStatus.ACTIVE,
      serviceType: { provider: 'hetzner', providerDefaults: {} },
    };

    beforeEach(() => {
      subscriptionItemsRepository.findByIdAndSubscriptionId.mockResolvedValue(provisionedItem);
    });

    it('publishes started notification after startServer', async () => {
      await service.startServer('sub-1', 'item-1', 'user-1');

      expect(provisioningService.startServer).toHaveBeenCalled();
      expect(billingNotificationPublisher.publish).toHaveBeenCalledWith(
        'subscription.service.started',
        { subscriptionId: 'sub-1', itemId: 'item-1' },
        'user-1',
      );
    });

    it('publishes stopped notification after stopServer', async () => {
      await service.stopServer('sub-1', 'item-1', 'user-1');

      expect(provisioningService.stopServer).toHaveBeenCalled();
      expect(billingNotificationPublisher.publish).toHaveBeenCalledWith(
        'subscription.service.stopped',
        { subscriptionId: 'sub-1', itemId: 'item-1' },
        'user-1',
      );
    });

    it('publishes restarted notification after restartServer', async () => {
      await service.restartServer('sub-1', 'item-1', 'user-1');

      expect(provisioningService.restartServer).toHaveBeenCalled();
      expect(billingNotificationPublisher.publish).toHaveBeenCalledWith(
        'subscription.service.restarted',
        { subscriptionId: 'sub-1', itemId: 'item-1' },
        'user-1',
      );
    });
  });
});
