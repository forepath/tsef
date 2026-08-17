import { Injectable, Logger } from '@nestjs/common';

import type { ProvisioningCredentials } from '../utils/provider-env-defaults.utils';
import type { ServerInfo } from '../utils/provisioning.utils';

import type { ProviderChangeServerTypeOptions } from './provider-module-registry.service';
import { ProviderModuleRegistryService } from './provider-module-registry.service';

const DIGITALOCEAN_PUBLIC_IP_POLL_INTERVAL_MS = 2000;
const DIGITALOCEAN_PUBLIC_IP_MAX_ATTEMPTS = 30;

/**
 * Dispatches cloud provisioning operations to registered provider modules.
 * Unknown providers and missing hooks fail closed.
 */
@Injectable()
export class ProvisioningDispatchService {
  private readonly logger = new Logger(ProvisioningDispatchService.name);

  constructor(private readonly providerModuleRegistry: ProviderModuleRegistryService) {}

  private resolveModule(providerId: string) {
    const trimmed = providerId?.trim();

    if (!trimmed) {
      throw new Error('Unknown provisioning provider');
    }

    const module = this.providerModuleRegistry.get(trimmed);

    if (!module) {
      throw new Error(`Unknown provisioning provider: ${trimmed}`);
    }

    return module;
  }

  private requireHook<T extends keyof BillingProviderModuleLike>(
    providerId: string,
    hook: T,
  ): NonNullable<BillingProviderModuleLike[T]> {
    const module = this.resolveModule(providerId);
    const handler = module[hook];

    if (typeof handler !== 'function') {
      throw new Error(`Provisioning provider is not provisionable: ${providerId}`);
    }

    return handler as NonNullable<BillingProviderModuleLike[T]>;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Resolves a public IPv4 for Cloudflare DNS after provision.
   * DigitalOcean often omits public v4 on the first droplet GET; poll until it appears or timeout.
   */
  async ensurePublicIpForDns(
    provider: string,
    serverId: string,
    initial: ServerInfo | null | undefined,
    credentials?: ProvisioningCredentials,
  ): Promise<string | undefined> {
    let info = initial ?? (await this.getServerInfo(provider, serverId, credentials));

    if (info?.publicIp) {
      return info.publicIp;
    }

    if (provider !== 'digital-ocean') {
      return undefined;
    }

    for (let attempt = 1; attempt < DIGITALOCEAN_PUBLIC_IP_MAX_ATTEMPTS; attempt++) {
      await this.delay(DIGITALOCEAN_PUBLIC_IP_POLL_INTERVAL_MS);
      info = await this.getServerInfo(provider, serverId, credentials);

      if (info?.publicIp) {
        return info.publicIp;
      }
    }

    this.logger.warn(
      `Timed out waiting for public IPv4 on DigitalOcean droplet ${serverId} after approximately ${
        DIGITALOCEAN_PUBLIC_IP_MAX_ATTEMPTS * DIGITALOCEAN_PUBLIC_IP_POLL_INTERVAL_MS
      }ms`,
    );

    return undefined;
  }

  async provision(
    provider: string,
    config: Record<string, unknown>,
    credentials?: ProvisioningCredentials,
  ): Promise<{ serverId: string }> {
    const provision = this.requireHook(provider, 'provision');

    return provision(config, credentials);
  }

  async deprovision(provider: string, serverId: string, credentials?: ProvisioningCredentials): Promise<void> {
    const deprovision = this.requireHook(provider, 'deprovision');

    await deprovision(serverId, credentials);
  }

  async getServerInfo(
    provider: string,
    serverId: string,
    credentials?: ProvisioningCredentials,
  ): Promise<ServerInfo | null> {
    const getServerInfo = this.requireHook(provider, 'getServerInfo');

    return getServerInfo(serverId, credentials);
  }

  async startServer(provider: string, serverId: string, credentials?: ProvisioningCredentials): Promise<void> {
    const startServer = this.requireHook(provider, 'startServer');

    await startServer(serverId, credentials);
  }

  async stopServer(provider: string, serverId: string, credentials?: ProvisioningCredentials): Promise<void> {
    const stopServer = this.requireHook(provider, 'stopServer');

    await stopServer(serverId, credentials);
  }

  async restartServer(provider: string, serverId: string, credentials?: ProvisioningCredentials): Promise<void> {
    const restartServer = this.requireHook(provider, 'restartServer');

    await restartServer(serverId, credentials);
  }

  async changeServerType(
    provider: string,
    serverId: string,
    serverType: string,
    options?: ProviderChangeServerTypeOptions,
  ): Promise<void> {
    const changeServerType = this.requireHook(provider, 'changeServerType');

    await changeServerType(serverId, serverType, options);
  }
}

type BillingProviderModuleLike = import('./provider-module-registry.service').BillingProviderModule;
