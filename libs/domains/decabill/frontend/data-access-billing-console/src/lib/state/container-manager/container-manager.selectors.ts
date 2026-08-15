import { createFeatureSelector, createSelector } from '@ngrx/store';

import type { ContainerManagerState } from './container-manager.reducer';

export const selectContainerManagerState = createFeatureSelector<ContainerManagerState>('containerManager');

export const selectContainerManagerSubscriptionId = createSelector(
  selectContainerManagerState,
  (state) => state.subscriptionId,
);
export const selectContainerManagerItemId = createSelector(selectContainerManagerState, (state) => state.itemId);
export const selectContainerManagerAdminMode = createSelector(selectContainerManagerState, (state) => state.adminMode);
export const selectContainerManagerContainers = createSelector(
  selectContainerManagerState,
  (state) => state.containers,
);
export const selectContainerManagerContainersCollectedAt = createSelector(
  selectContainerManagerState,
  (state) => state.containersCollectedAt,
);
export const selectContainerManagerNetworks = createSelector(selectContainerManagerState, (state) => state.networks);
export const selectContainerManagerTopologyNodes = createSelector(
  selectContainerManagerState,
  (state) => state.topologyNodes,
);
export const selectContainerManagerTopologyEdges = createSelector(
  selectContainerManagerState,
  (state) => state.topologyEdges,
);
export const selectContainerManagerNetworksCollectedAt = createSelector(
  selectContainerManagerState,
  (state) => state.networksCollectedAt,
);
export const selectContainerManagerSelectedContainerId = createSelector(
  selectContainerManagerState,
  (state) => state.selectedContainerId,
);
export const selectContainerManagerSelectedContainer = createSelector(
  selectContainerManagerContainers,
  selectContainerManagerSelectedContainerId,
  (containers, selectedId) => containers.find((container) => container.id === selectedId) ?? null,
);
export const selectContainerManagerStatsHistoryPoints = createSelector(
  selectContainerManagerState,
  (state) => state.statsHistoryPoints,
);
export const selectContainerManagerLogLines = createSelector(selectContainerManagerState, (state) => state.logLines);
export const selectContainerManagerLogsCollectedAt = createSelector(
  selectContainerManagerState,
  (state) => state.logsCollectedAt,
);
export const selectContainerManagerLogsTruncated = createSelector(
  selectContainerManagerState,
  (state) => state.logsTruncated,
);
export const selectContainerManagerLoadingContainers = createSelector(
  selectContainerManagerState,
  (state) => state.loadingContainers,
);
export const selectContainerManagerLoadingNetworks = createSelector(
  selectContainerManagerState,
  (state) => state.loadingNetworks,
);
export const selectContainerManagerLoadingStatsHistory = createSelector(
  selectContainerManagerState,
  (state) => state.loadingStatsHistory,
);
export const selectContainerManagerLoadingLogs = createSelector(
  selectContainerManagerState,
  (state) => state.loadingLogs,
);
export const selectContainerManagerError = createSelector(selectContainerManagerState, (state) => state.error);
export const selectContainerManagerLoadingAny = createSelector(
  selectContainerManagerState,
  (state) => state.loadingContainers || state.loadingNetworks || state.loadingStatsHistory || state.loadingLogs,
);
