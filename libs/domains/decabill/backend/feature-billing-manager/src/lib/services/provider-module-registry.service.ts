import { Injectable } from '@nestjs/common';
import type { MigrationInterface } from 'typeorm';

import type { DeclaredMeterDefinition } from '../dto/declared-meter.dto';
import type { MeterCollectContext, MeterCollectSample } from '../dto/meter-collect.types';
import type { ProviderLocationDto } from '../dto/provider-location.dto';
import type { ServerTypeDto } from '../dto/server-type.dto';
import type { ContributorJobDefinition } from '../utils/contributor-job.types';
import type { ProvisioningCredentials } from '../utils/provider-env-defaults.utils';
import type { ServerInfo } from '../utils/provisioning.utils';

export interface ProviderAvailabilityParams {
  region: string;
  serverType: string;
  providerDefaults?: Record<string, string>;
}

export interface ProviderAvailabilityResult {
  isAvailable: boolean;
  reason?: string;
  alternatives?: Record<string, unknown>;
  rawResponse?: Record<string, unknown>;
}

export interface ProviderChangeServerTypeOptions {
  isUpgrade?: boolean;
  credentials?: ProvisioningCredentials;
  sshPrivateKey?: string;
}

/**
 * Runtime provider module: meter collection and optional cloud provisioning hooks.
 * Distinct from ProviderDetailDto metadata (DYNAMIC_BILLING_PROVIDER_METADATA).
 * First-party provisioners implement provisioning hooks; meter-only DYNAMIC modules may omit them.
 */
export interface BillingProviderModule {
  /** Matches provider metadata id (hetzner, digital-ocean, …). */
  readonly id: string;
  /**
   * Optional declared meters for interval resolution / sync helpers.
   * Catalog sync still prefers metadata meters when present on ProviderDetailDto.
   */
  readonly meters?: DeclaredMeterDefinition[];
  collectMeters(ctx: MeterCollectContext): Promise<MeterCollectSample[]>;
  readonly jobs?: ContributorJobDefinition[];
  readonly migrations?: Array<new () => MigrationInterface>;
  provision?(config: Record<string, unknown>, credentials?: ProvisioningCredentials): Promise<{ serverId: string }>;
  deprovision?(serverId: string, credentials?: ProvisioningCredentials): Promise<void>;
  getServerInfo?(serverId: string, credentials?: ProvisioningCredentials): Promise<ServerInfo | null>;
  startServer?(serverId: string, credentials?: ProvisioningCredentials): Promise<void>;
  stopServer?(serverId: string, credentials?: ProvisioningCredentials): Promise<void>;
  restartServer?(serverId: string, credentials?: ProvisioningCredentials): Promise<void>;
  changeServerType?(serverId: string, serverType: string, options?: ProviderChangeServerTypeOptions): Promise<void>;
  getLocations?(providerDefaults?: Record<string, string>): Promise<ProviderLocationDto[]>;
  getServerTypes?(providerDefaults?: Record<string, string>): Promise<ServerTypeDto[]>;
  checkAvailability?(params: ProviderAvailabilityParams): Promise<ProviderAvailabilityResult>;
}

/**
 * Registry of runtime billing provider modules (first-party contributors + DYNAMIC_BILLING_PROVIDER_MODULES).
 */
@Injectable()
export class ProviderModuleRegistryService {
  private readonly modules = new Map<string, BillingProviderModule>();

  register(module: BillingProviderModule): void {
    this.modules.set(module.id, module);
  }

  get(id: string): BillingProviderModule | undefined {
    return this.modules.get(id);
  }

  has(id: string): boolean {
    return this.modules.has(id);
  }

  supportsProvisioning(id: string): boolean {
    return typeof this.get(id)?.provision === 'function';
  }

  list(): BillingProviderModule[] {
    return Array.from(this.modules.values());
  }
}
