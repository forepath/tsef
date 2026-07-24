import { Injectable } from '@nestjs/common';

import type { AddonConfigFieldDefinition } from '../utils/addon-config.utils';

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

export interface BillingAddonModule {
  readonly key: string;
  readonly displayName: string;
  /**
   * Declared config fields (like provider envDefaultFields / CloudInit env vars).
   * Persisted onto the catalog addon `configSchema` at create/update; admins set defaults only.
   */
  readonly configFields?: AddonConfigFieldDefinition[];
  provision(ctx: AddonLifecycleContext): Promise<void>;
  teardown(ctx: AddonLifecycleContext): Promise<void>;
}

/**
 * Registry of dynamically loaded addon modules (DYNAMIC_ADDON_MODULES).
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
