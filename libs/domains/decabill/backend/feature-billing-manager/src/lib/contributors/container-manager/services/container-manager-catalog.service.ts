import { Injectable } from '@nestjs/common';

import { AddonEntity } from '../../../entities/addon.entity';
import { BillingIntervalType } from '../../../entities/service-plan.entity';
import { AddonsRepository } from '../../../repositories/addons.repository';
import {
  CONTAINER_MANAGER_ADDON_KEY,
  CONTAINER_MANAGER_MODULE_KEY,
  ensureAddonIdInPlanLists,
  planHasIntegratedProvisioning,
  reconcilePlanAddonIdLists,
} from '../../../utils/plan-addons.utils';

/**
 * Ensures the first-party Container Manager catalog addon exists and can be
 * attached as mandatory on integrated Docker-host plans.
 */
@Injectable()
export class ContainerManagerCatalogService {
  constructor(private readonly addonsRepository: AddonsRepository) {}

  async ensureCatalogAddon(): Promise<AddonEntity> {
    const existing = await this.addonsRepository.findByKey(CONTAINER_MANAGER_ADDON_KEY);

    if (existing) {
      if (
        existing.implementationType !== 'module' ||
        existing.moduleKey !== CONTAINER_MANAGER_MODULE_KEY ||
        !existing.isActive
      ) {
        return await this.addonsRepository.update(existing.id, {
          name: 'Container Manager',
          description:
            existing.description ??
            'Docker host insights: containers, resource usage, and overlay networking on the service.',
          implementationType: 'module',
          moduleKey: CONTAINER_MANAGER_MODULE_KEY,
          basePrice: existing.basePrice ?? '0',
          priceIntervalType: existing.priceIntervalType ?? BillingIntervalType.MONTH,
          priceIntervalValue: existing.priceIntervalValue ?? 1,
          isActive: true,
        });
      }

      return existing;
    }

    return await this.addonsRepository.create({
      key: CONTAINER_MANAGER_ADDON_KEY,
      name: 'Container Manager',
      description: 'Docker host insights: containers, resource usage, and overlay networking on the service.',
      implementationType: 'module',
      moduleKey: CONTAINER_MANAGER_MODULE_KEY,
      configSchema: {},
      compatibleProviders: [],
      basePrice: '0',
      priceIntervalType: BillingIntervalType.MONTH,
      priceIntervalValue: 1,
      isActive: true,
    });
  }

  /**
   * For integrated stacks, ensures Container Manager is allowed and mandatory.
   * Custom-only plans are left unchanged.
   */
  async applyIntegratedPlanDefaults(
    providerConfigDefaults: Record<string, unknown> | undefined,
  ): Promise<Record<string, unknown>> {
    const defaults = reconcilePlanAddonIdLists(providerConfigDefaults);

    if (!planHasIntegratedProvisioning(defaults)) {
      return defaults;
    }

    const addon = await this.ensureCatalogAddon();

    return ensureAddonIdInPlanLists(defaults, addon.id, { mandatory: true });
  }
}
