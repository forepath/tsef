import type { Type } from '@angular/core';
import { CONTAINER_MANAGER_TAB_ID } from '@forepath/decabill/frontend/data-access-billing-console';

import { ContainerManagerTabComponent } from './tabs/container-manager/container-manager-tab.component';

/** Component contract for any contributor-registered service-detail tab (addon, stack, CloudInit). */
export type ServiceDetailTabComponent = Type<{
  subscriptionId: string;
  itemId: string;
  adminMode: boolean;
}>;

/** @deprecated Prefer ServiceDetailTabComponent */
export type ServiceDetailAddonTabComponent = ServiceDetailTabComponent;

/**
 * Frontend registry: tab id → component.
 * Backed by item-detail `tabs[]` from addons, integrated stacks, and CloudInit configs.
 */
export const SERVICE_DETAIL_TAB_REGISTRY: Record<string, ServiceDetailTabComponent> = {
  [CONTAINER_MANAGER_TAB_ID]: ContainerManagerTabComponent,
};

/** @deprecated Prefer SERVICE_DETAIL_TAB_REGISTRY */
export const SERVICE_DETAIL_ADDON_TAB_REGISTRY = SERVICE_DETAIL_TAB_REGISTRY;

export function resolveServiceDetailTabComponent(tabId: string): ServiceDetailTabComponent | null {
  return SERVICE_DETAIL_TAB_REGISTRY[tabId] ?? null;
}

/** @deprecated Prefer resolveServiceDetailTabComponent */
export function resolveServiceDetailAddonTabComponent(tabId: string): ServiceDetailTabComponent | null {
  return resolveServiceDetailTabComponent(tabId);
}
