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
  blockReadBytes: number | null;
  blockWriteBytes: number | null;
  networkRxBytes: number | null;
  networkTxBytes: number | null;
}

export interface ContainerManagerStatsHistoryResponseDto {
  containerId: string;
  points: ContainerManagerStatsHistoryPointDto[];
}

export interface ContainerManagerNetworkNodeDto {
  id: string;
  label: string;
  kind: 'container' | 'network' | 'exit' | 'route';
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

export interface ContainerManagerNetworksResponseDto {
  networks: ContainerManagerNetworkDto[];
  topology: {
    nodes: ContainerManagerNetworkNodeDto[];
    edges: ContainerManagerNetworkEdgeDto[];
  };
  collectedAt: string;
}
