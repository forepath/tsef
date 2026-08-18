import { Injectable } from '@nestjs/common';

import { AvailabilitySnapshotsRepository } from '../repositories/availability-snapshots.repository';

import { ProviderCatalogDispatchService } from './provider-catalog-dispatch.service';

export interface AvailabilityResult {
  isAvailable: boolean;
  reason?: string;
  alternatives?: Record<string, unknown>;
}

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly snapshotsRepository: AvailabilitySnapshotsRepository,
    private readonly catalogDispatch: ProviderCatalogDispatchService,
  ) {}

  async checkAvailability(
    provider: string,
    region: string,
    serverType: string,
    providerDefaults?: Record<string, string>,
  ): Promise<AvailabilityResult> {
    const { isAvailable, reason, alternatives, rawResponse } = await this.catalogDispatch.checkAvailability(
      provider,
      region,
      serverType,
      providerDefaults,
    );

    await this.snapshotsRepository.create({
      provider,
      region,
      serverType,
      isAvailable,
      rawResponse: rawResponse ?? {},
    });

    return { isAvailable, reason, alternatives };
  }
}
