import { Injectable } from '@nestjs/common';

import type { ServiceTabDefinition } from '../utils/service-detail-tabs.utils';

/**
 * Code module keyed by CloudInit config `key` (mirrors addon moduleKey).
 * Use DYNAMIC_CLOUD_INIT_MODULES for product-specific UI tabs without changing the DB schema.
 */
export interface CloudInitConfigModule {
  /** Must match `billing_cloud_init_configs.key` for the contributing template. */
  readonly key: string;
  readonly displayName: string;
  readonly serviceTabs?: ServiceTabDefinition[];
}

/**
 * Registry of CloudInit config code modules (DYNAMIC_CLOUD_INIT_MODULES).
 * Declarative tabs on the config entity are merged separately at item-detail time.
 */
@Injectable()
export class CloudInitModuleRegistryService {
  private readonly modules = new Map<string, CloudInitConfigModule>();

  register(module: CloudInitConfigModule): void {
    this.modules.set(module.key, module);
  }

  get(key: string): CloudInitConfigModule | undefined {
    return this.modules.get(key);
  }

  has(key: string): boolean {
    return this.modules.has(key);
  }

  list(): CloudInitConfigModule[] {
    return Array.from(this.modules.values());
  }
}
