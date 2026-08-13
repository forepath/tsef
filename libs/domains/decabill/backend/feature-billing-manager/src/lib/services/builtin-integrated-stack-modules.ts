import {
  IntegratedProvisioningService,
  integratedProvisioningServiceLabel,
} from '../utils/cloud-init/integrated-provisioning-service';

import type { IntegratedStackModule } from './integrated-stack-registry.service';

/**
 * Builtin integrated stacks. Tabs are empty by default; ship product-specific tabs
 * here or via DYNAMIC_INTEGRATED_STACK_MODULES the same way addon modules use serviceTabs.
 */
export function createBuiltinIntegratedStackModules(): IntegratedStackModule[] {
  return [
    IntegratedProvisioningService.AgenstraController,
    IntegratedProvisioningService.AgenstraManager,
    IntegratedProvisioningService.DecabillBilling,
  ].map((key) => ({
    key,
    displayName: integratedProvisioningServiceLabel(key),
    serviceTabs: [],
  }));
}
