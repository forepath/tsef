import { Injectable } from '@nestjs/common';

import { ProviderLocationDto } from '../dto/provider-location.dto';

import { ProviderCatalogDispatchService } from './provider-catalog-dispatch.service';

/**
 * Fetches geography options (locations/regions) from provisioning providers.
 * Used by the billing console to show human-readable labels for schema enums.
 */
@Injectable()
export class ProviderLocationsService {
  constructor(private readonly catalogDispatch: ProviderCatalogDispatchService) {}

  async getLocations(providerId: string, providerDefaults?: Record<string, string>): Promise<ProviderLocationDto[]> {
    return this.catalogDispatch.getLocations(providerId, providerDefaults);
  }
}
