import type { ServerInfoResponseDto } from '../dto/server-info-response.dto';
import type { SubscriptionItemResponseDto } from '../dto/subscription-item-response.dto';
import { toApiServiceTypeId } from '../constants/service-type-id.constants';
import type { ProvisioningStatus } from '../entities/subscription-item.entity';
import { normalizeCloudInitService } from './cloud-init/cloud-init-dispatch.utils';
import type { ServerInfo } from './provisioning.utils';

export function mapSubscriptionItemToResponse(item: {
  id: string;
  subscriptionId: string;
  serviceTypeId: string | null;
  serviceType?: { name?: string } | null;
  provisioningStatus: ProvisioningStatus;
  hostname?: string;
  displayName?: string | null;
  configSnapshot?: Record<string, unknown>;
  sshAccessGrantedAt?: Date | null;
}): SubscriptionItemResponseDto {
  const hasServiceType = item.serviceTypeId != null;
  const service = hasServiceType
    ? normalizeCloudInitService(item.configSnapshot?.service as string | undefined)
    : undefined;

  return {
    id: item.id,
    subscriptionId: item.subscriptionId,
    serviceTypeId: toApiServiceTypeId(item.serviceTypeId),
    serviceTypeName: item.serviceType?.name?.trim() || '',
    provisioningStatus: item.provisioningStatus,
    hostname: item.hostname,
    displayName: item.displayName ?? null,
    ...(service ? { service } : {}),
    sshAccessGranted: item.sshAccessGrantedAt != null,
  };
}

export function toServerInfoResponse(info: {
  name: string;
  publicIp: string;
  privateIp?: string;
  status: string;
  metadata?: Record<string, unknown>;
  hostname?: string;
  hostnameFqdn?: string;
}): ServerInfoResponseDto {
  return {
    name: info.name,
    publicIp: info.publicIp,
    privateIp: info.privateIp,
    status: info.status,
    metadata: info.metadata,
    hostname: info.hostname,
    hostnameFqdn: info.hostnameFqdn,
  };
}

export function mapServerInfoSnapshotToResponse(
  snapshot: Record<string, unknown>,
  hostname?: string,
  hostnameFqdn?: string,
): ServerInfoResponseDto | undefined {
  const name = typeof snapshot.name === 'string' ? snapshot.name : undefined;
  const publicIp = typeof snapshot.publicIp === 'string' ? snapshot.publicIp : undefined;

  if (!name || publicIp === undefined) {
    return undefined;
  }

  return {
    name,
    publicIp,
    privateIp: typeof snapshot.privateIp === 'string' ? snapshot.privateIp : undefined,
    status: typeof snapshot.status === 'string' ? snapshot.status : 'unknown',
    metadata:
      snapshot.metadata && typeof snapshot.metadata === 'object'
        ? (snapshot.metadata as Record<string, unknown>)
        : undefined,
    hostname,
    hostnameFqdn,
  };
}

export function mapServerInfoToResponse(info: ServerInfo): ServerInfoResponseDto {
  return toServerInfoResponse(info);
}
