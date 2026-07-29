import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import {
  SubscriptionItemResponseDto,
  SubscriptionSshAccessKeyResponseDto,
} from '../dto/subscription-item-response.dto';
import { BillingEmailPublisher } from '../email/billing-email.publisher';
import { ProvisioningStatus } from '../entities/subscription-item.entity';
import { BillingNotificationPublisher } from '../notifications/billing-notification.publisher';
import { ServicePlansRepository } from '../repositories/service-plans.repository';
import { SubscriptionItemsRepository } from '../repositories/subscription-items.repository';
import { normalizeCloudInitService } from '../utils/cloud-init/cloud-init-dispatch.utils';
import { getProvisioningCredentials } from '../utils/provider-env-defaults.utils';
import { ServerInfo } from '../utils/provisioning.utils';

import { CloudflareDnsService } from './cloudflare-dns.service';
import { ProvisioningService } from './provisioning.service';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class SubscriptionItemServerService {
  private readonly logger = new Logger(SubscriptionItemServerService.name);

  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly subscriptionItemsRepository: SubscriptionItemsRepository,
    private readonly provisioningService: ProvisioningService,
    private readonly cloudflareDnsService: CloudflareDnsService,
    private readonly servicePlansRepository: ServicePlansRepository,
    private readonly billingNotificationPublisher: BillingNotificationPublisher,
    private readonly billingEmailPublisher: BillingEmailPublisher,
  ) {}

  /**
   * Lists subscription items for a subscription. Ensures the subscription belongs to the user.
   */
  async listItems(subscriptionId: string, userId: string): Promise<SubscriptionItemResponseDto[]> {
    await this.subscriptionService.getSubscription(subscriptionId, userId);

    const items = await this.subscriptionItemsRepository.findBySubscription(subscriptionId);

    return items.map((item) => this.toItemResponse(item));
  }

  /**
   * One-time reveal of the provisioning SSH private key. Sets sshAccessGrantedAt and notifies.
   * Subsequent calls are rejected with ConflictException.
   */
  async getSshAccessKey(
    subscriptionId: string,
    itemId: string,
    userId: string,
  ): Promise<SubscriptionSshAccessKeyResponseDto> {
    const subscription = await this.subscriptionService.getSubscription(subscriptionId, userId);
    const item = await this.subscriptionItemsRepository.findByIdAndSubscriptionId(itemId, subscriptionId);

    if (!item) {
      throw new NotFoundException(`Subscription item ${itemId} not found`);
    }

    this.assertProvisioned(item.providerReference, item.provisioningStatus);

    const privateKey = item.sshPrivateKey?.trim();

    if (!privateKey) {
      throw new BadRequestException('SSH access key is not available for this service');
    }

    const claimed = await this.subscriptionItemsRepository.claimSshAccessGranted(itemId);

    if (!claimed) {
      throw new ConflictException('SSH access key has already been revealed for this service');
    }

    const grantedAt = new Date();
    const plan = await this.servicePlansRepository.findByIdOrThrow(subscription.planId);

    this.logger.log(
      `SSH access granted for subscription item ${itemId} on subscription ${subscriptionId} by user ${userId}`,
    );

    this.billingNotificationPublisher.publishSshAccessGranted({
      subscription,
      itemId: item.id,
      hostname: item.hostname,
      grantedAt,
    });
    await this.billingEmailPublisher.publishSshAccessGranted(subscription, plan.name, {
      itemId: item.id,
      hostname: item.hostname,
      grantedAt,
    });

    return { privateKey };
  }

  /**
   * Fetches server info from the provider, updates the cached snapshot, and returns it.
   * Ensures the subscription belongs to the user and the item is provisioned.
   */
  async getServerInfo(subscriptionId: string, itemId: string, userId: string): Promise<ServerInfo> {
    await this.subscriptionService.getSubscription(subscriptionId, userId);

    const item = await this.subscriptionItemsRepository.findByIdAndSubscriptionId(itemId, subscriptionId);

    if (!item) {
      throw new NotFoundException(`Subscription item ${itemId} not found`);
    }

    this.assertProvisioned(item.providerReference, item.provisioningStatus);

    const provider = item.serviceType?.provider;

    if (!provider) {
      throw new BadRequestException('Service type has no provider');
    }

    const credentials = getProvisioningCredentials(provider, item.serviceType?.providerDefaults);
    const info = await this.provisioningService.getServerInfo(provider, item.providerReference!, credentials);

    if (!info) {
      throw new BadRequestException('Provider does not support server info');
    }

    const metadata = { ...info.metadata, provider };
    const hostname = item.hostname;
    const hostnameFqdn = hostname ? this.cloudflareDnsService.getFqdn(hostname) : undefined;

    await this.subscriptionItemsRepository.updateServerInfoSnapshot(itemId, {
      serverId: info.serverId,
      name: info.name,
      publicIp: info.publicIp,
      privateIp: info.privateIp,
      status: info.status,
      metadata,
    });

    return { ...info, metadata, hostname, hostnameFqdn };
  }

  async startServer(subscriptionId: string, itemId: string, userId: string): Promise<void> {
    const item = await this.resolveItemForAction(subscriptionId, itemId, userId);
    const credentials = getProvisioningCredentials(item.serviceType!.provider!, item.serviceType!.providerDefaults);

    await this.provisioningService.startServer(item.serviceType!.provider!, item.providerReference!, credentials);
  }

  async stopServer(subscriptionId: string, itemId: string, userId: string): Promise<void> {
    const item = await this.resolveItemForAction(subscriptionId, itemId, userId);
    const credentials = getProvisioningCredentials(item.serviceType!.provider!, item.serviceType!.providerDefaults);

    await this.provisioningService.stopServer(item.serviceType!.provider!, item.providerReference!, credentials);
  }

  async restartServer(subscriptionId: string, itemId: string, userId: string): Promise<void> {
    const item = await this.resolveItemForAction(subscriptionId, itemId, userId);
    const credentials = getProvisioningCredentials(item.serviceType!.provider!, item.serviceType!.providerDefaults);

    await this.provisioningService.restartServer(item.serviceType!.provider!, item.providerReference!, credentials);
  }

  private toItemResponse(item: {
    id: string;
    subscriptionId: string;
    serviceTypeId: string;
    serviceType?: { name?: string } | null;
    provisioningStatus: ProvisioningStatus;
    hostname?: string;
    configSnapshot?: Record<string, unknown>;
    sshAccessGrantedAt?: Date | null;
  }): SubscriptionItemResponseDto {
    const service = normalizeCloudInitService(item.configSnapshot?.service as string | undefined);

    return {
      id: item.id,
      subscriptionId: item.subscriptionId,
      serviceTypeId: item.serviceTypeId,
      serviceTypeName: item.serviceType?.name?.trim() || '',
      provisioningStatus: item.provisioningStatus,
      hostname: item.hostname,
      service,
      sshAccessGranted: item.sshAccessGrantedAt != null,
    };
  }

  private async resolveItemForAction(subscriptionId: string, itemId: string, userId: string) {
    await this.subscriptionService.getSubscription(subscriptionId, userId);

    const item = await this.subscriptionItemsRepository.findByIdAndSubscriptionId(itemId, subscriptionId);

    if (!item) {
      throw new NotFoundException(`Subscription item ${itemId} not found`);
    }

    this.assertProvisioned(item.providerReference, item.provisioningStatus);

    if (!item.serviceType?.provider) {
      throw new BadRequestException('Service type has no provider');
    }

    return item;
  }

  private assertProvisioned(providerReference: string | undefined, status: ProvisioningStatus): void {
    if (!providerReference) {
      throw new BadRequestException('Service is not provisioned yet');
    }

    if (status !== ProvisioningStatus.ACTIVE) {
      throw new BadRequestException(
        `Service is not active (status: ${status}). Only provisioned services can be queried or controlled.`,
      );
    }
  }
}
