import { Injectable } from '@nestjs/common';

import type { ProviderLocationDto } from '../dto/provider-location.dto';
import type { ServerTypeDto } from '../dto/server-type.dto';

import type { ProviderAvailabilityParams, ProviderAvailabilityResult } from './provider-module-registry.service';
import { ProviderModuleRegistryService } from './provider-module-registry.service';
import { ProviderRegistryService } from './provider-registry.service';

/**
 * Dispatches provider catalog and availability reads to registered modules.
 */
@Injectable()
export class ProviderCatalogDispatchService {
  constructor(
    private readonly providerModuleRegistry: ProviderModuleRegistryService,
    private readonly providerRegistry: ProviderRegistryService,
  ) {}

  async getLocations(providerId: string, providerDefaults?: Record<string, string>): Promise<ProviderLocationDto[]> {
    const module = this.providerModuleRegistry.get(providerId);

    if (!module?.getLocations) {
      return [];
    }

    return module.getLocations(providerDefaults);
  }

  async getServerTypes(providerId: string, providerDefaults?: Record<string, string>): Promise<ServerTypeDto[]> {
    const module = this.providerModuleRegistry.get(providerId);

    if (!module?.getServerTypes) {
      return [];
    }

    return module.getServerTypes(providerDefaults);
  }

  async checkAvailability(
    provider: string,
    region: string,
    serverType: string,
    providerDefaults?: Record<string, string>,
  ): Promise<ProviderAvailabilityResult> {
    const module = this.providerModuleRegistry.get(provider);
    const params: ProviderAvailabilityParams = { region, serverType, providerDefaults };

    if (module?.checkAvailability) {
      return module.checkAvailability(params);
    }

    return { isAvailable: true };
  }

  requiresProvisioning(providerId: string | undefined): boolean {
    const trimmed = providerId?.trim();

    if (!trimmed) {
      return false;
    }

    return this.providerModuleRegistry.supportsProvisioning(trimmed);
  }

  hasRegisteredMetadata(providerId: string | undefined): boolean {
    const trimmed = providerId?.trim();

    if (!trimmed) {
      return false;
    }

    return this.providerRegistry.hasProvider(trimmed);
  }
}
