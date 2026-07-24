import { Injectable, Logger } from '@nestjs/common';

import { AddonEntity } from '../entities/addon.entity';
import { SubscriptionAddonEntity } from '../entities/subscription-addon.entity';
import { SubscriptionItemEntity } from '../entities/subscription-item.entity';
import { ServicePlanEntity } from '../entities/service-plan.entity';
import { SubscriptionEntity } from '../entities/subscription.entity';
import { BillingEmailPublisher } from '../email/billing-email.publisher';
import { BillingNotificationPublisher } from '../notifications/billing-notification.publisher';
import { SubscriptionAddonsRepository } from '../repositories/subscription-addons.repository';
import {
  interpolateAddonScriptTemplate,
  parseAddonConfigFields,
  resolveAddonConfigValues,
} from '../utils/addon-config.utils';
import { convertAddonPriceToPlanPeriod } from '../utils/addon-pricing.util';

import { AddonModuleRegistryService, type AddonLifecycleContext } from './addon-module-registry.service';

@Injectable()
export class AddonLifecycleService {
  private readonly logger = new Logger(AddonLifecycleService.name);

  constructor(
    private readonly subscriptionAddonsRepository: SubscriptionAddonsRepository,
    private readonly addonModuleRegistry: AddonModuleRegistryService,
    private readonly billingNotificationPublisher: BillingNotificationPublisher,
    private readonly billingEmailPublisher: BillingEmailPublisher,
  ) {}

  async createPendingSubscriptionAddons(params: {
    subscriptionId: string;
    addons: AddonEntity[];
    plan: Pick<ServicePlanEntity, 'billingIntervalType' | 'billingIntervalValue'>;
    addonConfigs?: Record<string, Record<string, string>>;
  }): Promise<SubscriptionAddonEntity[]> {
    const { subscriptionId, addons, plan, addonConfigs } = params;

    if (addons.length === 0) {
      return [];
    }

    return await this.subscriptionAddonsRepository.createMany(
      addons.map((addon) => {
        const periodPrice = convertAddonPriceToPlanPeriod(addon, plan);
        const fields = parseAddonConfigFields(addon.configSchema);
        const resolved =
          fields.length === 0
            ? addon.configDefaultValues
              ? { ...addon.configDefaultValues }
              : undefined
            : resolveAddonConfigValues(fields as never, addon.configDefaultValues, addonConfigs?.[addon.id]);

        return {
          subscriptionId,
          addonId: addon.id,
          status: 'pending',
          configSnapshot: resolved,
          unitPriceSnapshot: String(periodPrice),
          priceIntervalType: plan.billingIntervalType,
          priceIntervalValue: plan.billingIntervalValue,
          addonNameSnapshot: addon.name,
        };
      }),
    );
  }

  async listForSubscription(subscriptionId: string): Promise<SubscriptionAddonEntity[]> {
    return await this.subscriptionAddonsRepository.findBySubscriptionId(subscriptionId);
  }

  /**
   * Interpolate and collect cloud-init scripts for selected addons (appended after primary user-data).
   */
  collectInterpolatedCloudInitScripts(
    rows: Array<{ addon?: AddonEntity | null; configSnapshot?: Record<string, unknown> | null }>,
  ): string[] {
    const scripts: string[] = [];

    for (const row of rows) {
      const addon = row.addon;

      if (!addon || addon.implementationType !== 'cloud_init_script' || !addon.scriptTemplate?.trim()) {
        continue;
      }

      const fields = parseAddonConfigFields(addon.configSchema);
      const envKeys = fields.map((field) => field.key);
      const env: Record<string, string> = {};

      for (const [key, value] of Object.entries(row.configSnapshot ?? {})) {
        if (typeof value === 'string') {
          env[key] = value;
        } else if (value !== undefined && value !== null) {
          env[key] = String(value);
        }
      }

      scripts.push(interpolateAddonScriptTemplate(addon.scriptTemplate.trim(), env, envKeys));
    }

    return scripts;
  }

  /** @deprecated Prefer collectInterpolatedCloudInitScripts with subscription rows. */
  collectCloudInitScripts(addons: AddonEntity[]): string[] {
    return addons
      .filter((addon) => addon.implementationType === 'cloud_init_script' && addon.scriptTemplate?.trim())
      .map((addon) => addon.scriptTemplate!.trim());
  }

  appendScriptsToUserData(userData: string, scripts: string[]): string {
    if (scripts.length === 0) {
      return userData;
    }

    const blocks = scripts.map((script, index) => `\n\n# --- Decabill addon script ${index + 1} ---\n${script}`);

    return `${userData}${blocks.join('')}`;
  }

  async activateAfterProvisioning(params: {
    subscription: SubscriptionEntity;
    plan: ServicePlanEntity;
    item: SubscriptionItemEntity;
    provider: string;
  }): Promise<void> {
    const rows = await this.subscriptionAddonsRepository.findBySubscriptionId(params.subscription.id);
    const pending = rows.filter((row) => row.status === 'pending' || row.status === 'failed');

    for (const row of pending) {
      const addon = row.addon;

      if (!addon) {
        continue;
      }

      try {
        if (addon.implementationType === 'module') {
          const module = addon.moduleKey ? this.addonModuleRegistry.get(addon.moduleKey) : undefined;

          if (!module) {
            throw new Error(`Addon module "${addon.moduleKey}" is not registered`);
          }

          const ctx: AddonLifecycleContext = {
            subscriptionId: params.subscription.id,
            subscriptionItemId: params.item.id,
            addonId: addon.id,
            addonKey: addon.key,
            provider: params.provider,
            providerReference: params.item.providerReference,
            configSnapshot: row.configSnapshot,
            hostname: params.item.hostname,
          };

          await module.provision(ctx);
        }

        row.status = 'active';
        row.activatedAt = new Date();
        row.deactivatedAt = null;
        await this.subscriptionAddonsRepository.save(row);

        this.billingNotificationPublisher.publishAddon('addon.activated', {
          subscription: params.subscription,
          plan: params.plan,
          addon,
          subscriptionAddon: row,
        });
        await this.billingEmailPublisher.publishAddonActivated(params.subscription, params.plan.name, addon.name);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        this.logger.error(
          `Failed to provision addon ${addon.key} for subscription ${params.subscription.id}: ${message}`,
        );
        row.status = 'failed';
        await this.subscriptionAddonsRepository.save(row);

        this.billingNotificationPublisher.publishAddon('addon.provision_failed', {
          subscription: params.subscription,
          plan: params.plan,
          addon,
          subscriptionAddon: row,
          errorMessage: message,
        });
        await this.billingEmailPublisher.publishAddonProvisionFailed(params.subscription, params.plan.name, addon.name);
      }
    }
  }

  async teardownForSubscription(params: {
    subscription: SubscriptionEntity;
    plan: ServicePlanEntity;
    items: SubscriptionItemEntity[];
    providerByItemId: Map<string, string>;
  }): Promise<void> {
    const rows = await this.subscriptionAddonsRepository.findBySubscriptionId(params.subscription.id);
    const active = rows.filter((row) => row.status === 'active' || row.status === 'pending');

    for (const row of active) {
      const addon = row.addon;

      if (!addon) {
        continue;
      }

      row.status = 'tearing_down';
      await this.subscriptionAddonsRepository.save(row);

      try {
        if (addon.implementationType === 'module') {
          const module = addon.moduleKey ? this.addonModuleRegistry.get(addon.moduleKey) : undefined;

          if (module) {
            const item = params.items[0];
            const ctx: AddonLifecycleContext = {
              subscriptionId: params.subscription.id,
              subscriptionItemId: item?.id,
              addonId: addon.id,
              addonKey: addon.key,
              provider: item ? (params.providerByItemId.get(item.id) ?? '') : '',
              providerReference: item?.providerReference,
              configSnapshot: row.configSnapshot,
              hostname: item?.hostname,
            };

            await module.teardown(ctx);
          }
        }

        row.status = 'inactive';
        row.deactivatedAt = new Date();
        await this.subscriptionAddonsRepository.save(row);

        this.billingNotificationPublisher.publishAddon('addon.deactivated', {
          subscription: params.subscription,
          plan: params.plan,
          addon,
          subscriptionAddon: row,
        });
        await this.billingEmailPublisher.publishAddonDeactivated(params.subscription, params.plan.name, addon.name);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        this.logger.error(
          `Failed to teardown addon ${addon.key} for subscription ${params.subscription.id}: ${message}`,
        );
        row.status = 'failed';
        await this.subscriptionAddonsRepository.save(row);

        this.billingNotificationPublisher.publishAddon('addon.teardown_failed', {
          subscription: params.subscription,
          plan: params.plan,
          addon,
          subscriptionAddon: row,
          errorMessage: message,
        });
        await this.billingEmailPublisher.publishAddonTeardownFailed(params.subscription, params.plan.name, addon.name);
      }
    }
  }
}
