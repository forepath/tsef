import { createReducer, on } from '@ngrx/store';

import type {
  ContainerManagerContainer,
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
  networksCollectedAt: string | null;
  selectedContainerId: string | null;
  statsHistoryContainerId: string | null;
  statsHistoryPoints: ContainerManagerStatsHistoryPoint[];
  loadingContainers: boolean;
  loadingNetworks: boolean;
  loadingStatsHistory: boolean;
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
  networksCollectedAt: null,
  selectedContainerId: null,
  statsHistoryContainerId: null,
  statsHistoryPoints: [],
  loadingContainers: false,
  loadingNetworks: false,
  loadingStatsHistory: false,
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
  on(clearContainerManager, () => initialContainerManagerState),
);
