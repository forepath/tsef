import type { InstanceDependencyHealth } from '@forepath/shared/backend';

export class InstanceStatusResponseDto {
  instanceId!: string;
  serviceName!: string;
  role!: string;
  hostname!: string;
  installedVersion!: string;
  startedAt!: string;
  uptimeSeconds!: number;
  dependencies!: InstanceDependencyHealth;
}
