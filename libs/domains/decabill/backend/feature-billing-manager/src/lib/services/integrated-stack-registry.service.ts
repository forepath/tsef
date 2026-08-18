import { Injectable } from '@nestjs/common';
import type { MigrationInterface } from 'typeorm';

import type { IntegratedProvisioningService } from '../utils/cloud-init/integrated-provisioning-service';
import type { ContributorJobDefinition } from '../utils/contributor-job.types';
import type { ServiceTabDefinition } from '../utils/service-detail-tabs.utils';

/**
 * First-party or dynamically loaded integrated product stack that can contribute
 * service-detail tabs when a subscription item runs that stack.
 */
export interface IntegratedStackModule {
  readonly key: IntegratedProvisioningService | string;
  readonly displayName: string;
  /**
   * Additional service-detail tabs when the item's configSnapshot.service matches this key.
   */
  readonly serviceTabs?: ServiceTabDefinition[];
  readonly jobs?: ContributorJobDefinition[];
  readonly migrations?: Array<new () => MigrationInterface>;
}

/**
 * Registry of integrated stack modules (builtins + DYNAMIC_INTEGRATED_STACK_MODULES).
 */
@Injectable()
export class IntegratedStackRegistryService {
  private readonly modules = new Map<string, IntegratedStackModule>();

  register(module: IntegratedStackModule): void {
    this.modules.set(module.key, module);
  }

  get(key: string): IntegratedStackModule | undefined {
    return this.modules.get(key);
  }

  has(key: string): boolean {
    return this.modules.has(key);
  }

  list(): IntegratedStackModule[] {
    return Array.from(this.modules.values());
  }
}
