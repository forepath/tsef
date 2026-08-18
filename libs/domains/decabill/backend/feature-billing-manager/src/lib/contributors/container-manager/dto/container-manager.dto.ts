export interface ContainerManagerResourceStatsDto {
  cpuPercent: number | null;
  memoryUsageBytes: number | null;
  memoryLimitBytes: number | null;
  memoryPercent: number | null;
  blockReadBytes: number | null;
  blockWriteBytes: number | null;
  networkRxBytes: number | null;
  networkTxBytes: number | null;
}

export interface ContainerManagerContainerDto {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  createdAt: string | null;
  stats: ContainerManagerResourceStatsDto | null;
}

export interface ContainerManagerContainersResponseDto {
  containers: ContainerManagerContainerDto[];
  collectedAt: string;
}

export interface ContainerManagerStatsHistoryPointDto {
  timestamp: string;
  cpuPercent: number | null;
  memoryPercent: number | null;
  memoryUsageBytes: number | null;
  memoryLimitBytes: number | null;
  blockReadBytes: number | null;
  blockWriteBytes: number | null;
  networkRxBytes: number | null;
  networkTxBytes: number | null;
}

export interface ContainerManagerStatsHistoryResponseDto {
  containerId: string;
  points: ContainerManagerStatsHistoryPointDto[];
}

export interface ContainerManagerLogsResponseDto {
  containerId: string;
  /** Newest-last docker log lines (timestamps included when available). */
  lines: string[];
  collectedAt: string;
  /** True when the response was clipped to the size budget. */
  truncated: boolean;
  /** Effective `docker logs --tail` value used for this collection. */
  tail: number;
}

export type ContainerManagerNetworkNodeKind =
  | 'container'
  | 'network'
  | 'exit'
  | 'route'
  | 'host_iface'
  | 'host_gateway'
  | 'internet';

export interface ContainerManagerNetworkNodeDto {
  id: string;
  label: string;
  kind: ContainerManagerNetworkNodeKind;
}

export interface ContainerManagerNetworkEdgeDto {
  id: string;
  from: string;
  to: string;
  label?: string;
}

export interface ContainerManagerNetworkDto {
  id: string;
  name: string;
  driver: string;
  scope: string;
  isOverlay: boolean;
  containers: string[];
  /** Exit / gateway endpoints when discoverable. */
  exitNodes: string[];
  routes: Array<{ destination: string; gateway?: string }>;
}

export interface ContainerManagerHostInterfaceDto {
  name: string;
  state: string;
  addresses: string[];
}

export interface ContainerManagerHostRouteDto {
  destination: string;
  gateway?: string;
  device?: string;
}

export interface ContainerManagerNetworksResponseDto {
  networks: ContainerManagerNetworkDto[];
  topology: {
    nodes: ContainerManagerNetworkNodeDto[];
    edges: ContainerManagerNetworkEdgeDto[];
  };
  /** Host interfaces from `ip -j addr` when available. */
  hostInterfaces: ContainerManagerHostInterfaceDto[];
  /** Host routes from `ip -j route` when available. */
  hostRoutes: ContainerManagerHostRouteDto[];
  collectedAt: string;
}
