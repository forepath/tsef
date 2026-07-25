import { Injectable } from '@nestjs/common';

import { ProviderDetailDto } from '../dto/provider-detail.dto';

/**
 * Registry of billing/provisioning providers.
 * Returns provider details (id, displayName, configSchema) for use in service type creation
 * and subscription configuration. Follows the same pattern as agent-controller's provider factory:
 * providers register themselves and the registry exposes the list to clients.
 */
@Injectable()
export class ProviderRegistryService {
  private readonly providers = new Map<string, ProviderDetailDto>();

  /**
   * Register a provider. Overwrites if id already exists.
   */
  register(detail: ProviderDetailDto): void {
    this.providers.set(detail.id, {
      ...detail,
      // Fail closed: dynamic metadata plugins must opt in explicitly.
      supportsAddons: detail.supportsAddons === true,
      supportsServerTypeUpgrade: detail.supportsServerTypeUpgrade === true,
      supportsServerTypeDowngrade: detail.supportsServerTypeDowngrade === true,
    });
  }

  /**
   * Get a single provider detail by id, if registered.
   */
  getProvider(id: string): ProviderDetailDto | undefined {
    return this.providers.get(id);
  }

  /**
   * Get all registered provider details.
   */
  getProviders(): ProviderDetailDto[] {
    return Array.from(this.providers.values());
  }

  /**
   * Check if a provider id is registered.
   */
  hasProvider(id: string): boolean {
    return this.providers.has(id);
  }
}
