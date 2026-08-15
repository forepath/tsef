import type { BillingAddonModule } from './addon-module-registry.service';
import { CONTAINER_MANAGER_MODULE_KEY } from '../utils/plan-addons.utils';

/**
 * First-party Container Manager addon module.
 * Host diagnostics run over SSH from ContainerManagerService; provision/teardown are readiness no-ops.
 */
export function createBuiltinAddonModules(): BillingAddonModule[] {
  return [
    {
      key: CONTAINER_MANAGER_MODULE_KEY,
      displayName: 'Container Manager',
      serviceTabs: [
        {
          id: 'container-manager',
          label: 'Container Manager',
          order: 100,
        },
      ],
      async provision(): Promise<void> {
        // No remote install required; Docker is already present on integrated stacks.
      },
      async teardown(): Promise<void> {
        // No remote teardown; diagnostics are read-only.
      },
    },
  ];
}
