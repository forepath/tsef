import { createReducer, on } from '@ngrx/store';

import type {
  ContainerManagerContainer,
  ContainerManagerHostInterface,
  ContainerManagerHostRoute,
  ContainerManagerNetwork,
  ContainerManagerNetworkEdge,
  ContainerManagerNetworkNode,
  ContainerManagerStatsHistoryPoint,
} from '../../types/billing.types';

import {
  clearContainerManager,
  enterContainerManager,
  loadContainersFailure,
  loadContainersSuccess,
  loadLogs,
  loadLogsFailure,
  loadLogsSuccess,
  loadNetworksFailure,
  loadNetworksSuccess,
  loadStatsHistory,
  loadStatsHistoryFailure,
  loadStatsHistorySuccess,
  selectContainer,
} from './container-manager.actions';

export interface ContainerManagerState {
  subscriptionId: string | null;
  itemId: string | null;
  adminMode: boolean;
  containers: ContainerManagerContainer[];
  containersCollectedAt: string | null;
  networks: ContainerManagerNetwork[];
  topologyNodes: ContainerManagerNetworkNode[];
  topologyEdges: ContainerManagerNetworkEdge[];
  hostInterfaces: ContainerManagerHostInterface[];
  hostRoutes: ContainerManagerHostRoute[];
  networksCollectedAt: string | null;
  selectedContainerId: string | null;
  statsHistoryContainerId: string | null;
  statsHistoryPoints: ContainerManagerStatsHistoryPoint[];
  logsContainerId: string | null;
  logLines: string[];
  logsCollectedAt: string | null;
  logsTruncated: boolean;
  loadingContainers: boolean;
  loadingNetworks: boolean;
  loadingStatsHistory: boolean;
  loadingLogs: boolean;
  error: string | null;
}

export const initialContainerManagerState: ContainerManagerState = {
  subscriptionId: null,
  itemId: null,
  adminMode: false,
  containers: [],
  containersCollectedAt: null,
  networks: [],
  topologyNodes: [],
  topologyEdges: [],
  hostInterfaces: [],
  hostRoutes: [],
  networksCollectedAt: null,
  selectedContainerId: null,
  statsHistoryContainerId: null,
  statsHistoryPoints: [],
  logsContainerId: null,
  logLines: [],
  logsCollectedAt: null,
  logsTruncated: false,
  loadingContainers: false,
  loadingNetworks: false,
  loadingStatsHistory: false,
  loadingLogs: false,
  error: null,
};

export const containerManagerReducer = createReducer(
  initialContainerManagerState,
  on(enterContainerManager, (state, { subscriptionId, itemId, adminMode }) => ({
    ...initialContainerManagerState,
    subscriptionId,
    itemId,
    adminMode: adminMode === true,
    loadingContainers: true,
    loadingNetworks: true,
    error: null,
  })),
  on(loadContainersSuccess, (state, { response }) => {
    const containers = response.containers ?? [];
    const selectedStillPresent =
      state.selectedContainerId != null && containers.some((container) => container.id === state.selectedContainerId);
    const selectedContainerId = selectedStillPresent ? state.selectedContainerId : (containers[0]?.id ?? null);

    return {
      ...state,
      containers,
      containersCollectedAt: response.collectedAt ?? null,
      selectedContainerId,
      loadingContainers: false,
      error: null,
    };
  }),
  on(loadContainersFailure, (state, { error }) => ({
    ...state,
    loadingContainers: false,
    error,
  })),
  on(loadNetworksSuccess, (state, { response }) => ({
    ...state,
    networks: response.networks ?? [],
    topologyNodes: response.topology?.nodes ?? [],
    topologyEdges: response.topology?.edges ?? [],
    hostInterfaces: response.hostInterfaces ?? [],
    hostRoutes: response.hostRoutes ?? [],
    networksCollectedAt: response.collectedAt ?? null,
    loadingNetworks: false,
    error: null,
  })),
  on(loadNetworksFailure, (state, { error }) => ({
    ...state,
    loadingNetworks: false,
    error,
  })),
  on(selectContainer, (state, { containerId }) => ({
    ...state,
    selectedContainerId: containerId,
    logLines: containerId === state.logsContainerId ? state.logLines : [],
    logsCollectedAt: containerId === state.logsContainerId ? state.logsCollectedAt : null,
    logsTruncated: containerId === state.logsContainerId ? state.logsTruncated : false,
  })),
  on(loadStatsHistory, (state, { containerId }) => ({
    ...state,
    statsHistoryContainerId: containerId,
    loadingStatsHistory: true,
    error: null,
  })),
  on(loadStatsHistorySuccess, (state, { response }) => ({
    ...state,
    statsHistoryContainerId: response.containerId,
    statsHistoryPoints: response.points ?? [],
    loadingStatsHistory: false,
    error: null,
  })),
  on(loadStatsHistoryFailure, (state, { error }) => ({
    ...state,
    loadingStatsHistory: false,
    error,
  })),
  on(loadLogs, (state, { containerId, silent }) => ({
    ...state,
    logsContainerId: containerId,
    loadingLogs: silent === true ? state.loadingLogs : true,
    error: silent === true ? state.error : null,
  })),
  on(loadLogsSuccess, (state, { response }) => ({
    ...state,
    logsContainerId: response.containerId,
    logLines: response.lines ?? [],
    logsCollectedAt: response.collectedAt ?? null,
    logsTruncated: response.truncated === true,
    loadingLogs: false,
    error: null,
  })),
  on(loadLogsFailure, (state, { error, silent }) => ({
    ...state,
    loadingLogs: false,
    error: silent === true ? state.error : error,
  })),
  on(clearContainerManager, () => initialContainerManagerState),
);
