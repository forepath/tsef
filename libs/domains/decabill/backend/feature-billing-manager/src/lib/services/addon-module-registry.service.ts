import { Injectable } from '@nestjs/common';

import type { DeclaredMeterDefinition } from '../dto/declared-meter.dto';
import type { MeterCollectContext, MeterCollectSample } from '../dto/meter-collect.types';
import type { AddonConfigFieldDefinition } from '../utils/addon-config.utils';
import type { ServiceTabDefinition } from '../utils/service-detail-tabs.utils';

export interface AddonLifecycleContext {
  subscriptionId: string;
  subscriptionItemId?: string;
  addonId: string;
  addonKey: string;
  provider: string;
  providerReference?: string;
  configSnapshot?: Record<string, unknown>;
  hostname?: string;
}

/** @deprecated Prefer ServiceTabDefinition — kept as an alias for addon module typing. */
export type AddonServiceTabDefinition = ServiceTabDefinition;

export interface BillingAddonModule {
  readonly key: string;
  readonly displayName: string;
  /**
   * Declared config fields (like provider envDefaultFields / CloudInit env vars).
   * Persisted onto the catalog addon `configSchema` at create/update; admins set defaults only.
   */
  readonly configFields?: AddonConfigFieldDefinition[];
  /**
   * Required usage meters declared by the module implementation.
   * Sideloaded onto the catalog addon as non-removable attachments.
   */
  readonly meters?: DeclaredMeterDefinition[];
  /**
   * Additional service-detail tabs registered when a subscription has this module addon active.
   */
  readonly serviceTabs?: AddonServiceTabDefinition[];
  provision(ctx: AddonLifecycleContext): Promise<void>;
  teardown(ctx: AddonLifecycleContext): Promise<void>;
  /**
   * Optional pull hook for meters with collectionIntervalMs.
   * Invoked by the meter-collect job when due; omit to keep meters push-only.
   */
  collectMeters?(ctx: MeterCollectContext): Promise<MeterCollectSample[]>;
}

/**
 * Registry of dynamically loaded addon modules (DYNAMIC_ADDON_MODULES) and builtins.
 */
@Injectable()
export class AddonModuleRegistryService {
  private readonly modules = new Map<string, BillingAddonModule>();

  register(module: BillingAddonModule): void {
    this.modules.set(module.key, module);
  }

  get(key: string): BillingAddonModule | undefined {
    return this.modules.get(key);
  }

  has(key: string): boolean {
    return this.modules.has(key);
  }

  list(): BillingAddonModule[] {
    return Array.from(this.modules.values());
  }
}
