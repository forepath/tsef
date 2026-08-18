import { Injectable } from '@nestjs/common';

import { ServerTypeDto } from '../dto/server-type.dto';

import { ProviderCatalogDispatchService } from './provider-catalog-dispatch.service';

/**
 * Fetches server types with pricing from provisioning providers.
 * Used by the billing console to show server type dropdowns with price and to auto-set base price.
 */
@Injectable()
export class ProviderServerTypesService {
  constructor(private readonly catalogDispatch: ProviderCatalogDispatchService) {}

  async getServerTypes(providerId: string, providerDefaults?: Record<string, string>): Promise<ServerTypeDto[]> {
    return this.catalogDispatch.getServerTypes(providerId, providerDefaults);
  }
}
