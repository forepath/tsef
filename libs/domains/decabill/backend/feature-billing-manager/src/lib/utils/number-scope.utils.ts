import { SHARED_NUMBER_SCOPE, areTenantsNumbersShared } from '@forepath/shared/backend';

import { getRequiredTenantId } from './tenant-query.utils';

/**
 * Scope key for invoice / subscription / debtor number pools.
 * Shared mode (default): {@link SHARED_NUMBER_SCOPE}; otherwise the current tenant id.
 */
export function resolveNumberScopeKey(): string {
  return areTenantsNumbersShared() ? SHARED_NUMBER_SCOPE : getRequiredTenantId();
}
