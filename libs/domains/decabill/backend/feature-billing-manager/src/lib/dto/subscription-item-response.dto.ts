import type { ServerInfoResponseDto } from './server-info-response.dto';

/**
 * Subscription item in API responses. Provider reference is internal only and never exposed.
 */
export interface SubscriptionItemResponseDto {
  id: string;
  subscriptionId: string;
  serviceTypeId: string | null;
  /** User-facing service type name from the catalog (billing_service_types.name). */
  serviceTypeName: string;
  provisioningStatus: 'pending' | 'active' | 'failed';
  /** Single-level subdomain when provisioned (e.g. awesome-armadillo-abc12) */
  hostname?: string;
  /** Customer-defined label; null when unset. */
  displayName: string | null;
  /** Product service from config snapshot: agenstra-controller, agenstra-manager, decabill-billing, or custom CloudInit template. Defaults to agenstra-controller. */
  service?: 'agenstra-controller' | 'agenstra-manager' | 'decabill-billing' | 'custom';
  /** True after the customer has revealed the provisioning SSH private key at least once. */
  sshAccessGranted: boolean;
}

/** Detail view for an active provisioned subscription item, including cached or live server info. */
export interface SubscriptionItemDetailResponseDto extends SubscriptionItemResponseDto {
  serverInfo?: ServerInfoResponseDto;
}

/** One-time SSH private key response. Never log this payload. */
export interface SubscriptionSshAccessKeyResponseDto {
  privateKey: string;
}
