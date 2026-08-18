import { canonicalizeCloudInitService, CloudInitServiceType } from './integrated-provisioning-service';

export { CloudInitServiceType } from './integrated-provisioning-service';

/**
 * Maps stored or requested service ids (including legacy aliases) for read paths.
 * Unknown values default to agenstra-controller. Provisioning must use CloudInitDispatchService
 * instead, which fails closed for unknown integrated keys.
 */
export function normalizeCloudInitService(service: string | undefined): CloudInitServiceType {
  return canonicalizeCloudInitService(service);
}
