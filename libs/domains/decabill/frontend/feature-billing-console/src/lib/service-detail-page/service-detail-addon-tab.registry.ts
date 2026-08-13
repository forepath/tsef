import type { Type } from '@angular/core';
import { CONTAINER_MANAGER_TAB_ID } from '@forepath/decabill/frontend/data-access-billing-console';

import { ContainerManagerTabComponent } from './tabs/container-manager/container-manager-tab.component';

export type ServiceDetailAddonTabComponent = Type<{
  subscriptionId: string;
  itemId: string;
  adminMode: boolean;
}>;

export const SERVICE_DETAIL_ADDON_TAB_REGISTRY: Record<string, ServiceDetailAddonTabComponent> = {
  [CONTAINER_MANAGER_TAB_ID]: ContainerManagerTabComponent,
};

export function resolveServiceDetailAddonTabComponent(tabId: string): ServiceDetailAddonTabComponent | null {
  return SERVICE_DETAIL_ADDON_TAB_REGISTRY[tabId] ?? null;
}
