import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';

import { clearContainerManager, enterContainerManager, selectContainer } from './container-manager.actions';
import {
  selectContainerManagerContainers,
  selectContainerManagerContainersCollectedAt,
  selectContainerManagerError,
  selectContainerManagerLoadingAny,
  selectContainerManagerLoadingContainers,
  selectContainerManagerLoadingLogs,
  selectContainerManagerLoadingNetworks,
  selectContainerManagerLoadingStatsHistory,
  selectContainerManagerLogLines,
  selectContainerManagerLogsCollectedAt,
  selectContainerManagerLogsTruncated,
  selectContainerManagerNetworks,
  selectContainerManagerNetworksCollectedAt,
  selectContainerManagerSelectedContainer,
  selectContainerManagerSelectedContainerId,
  selectContainerManagerStatsHistoryPoints,
  selectContainerManagerTopologyEdges,
  selectContainerManagerTopologyNodes,
} from './container-manager.selectors';

@Injectable({
  providedIn: 'root',
})
export class ContainerManagerFacade {
  private readonly store = inject(Store);

  readonly containers$ = this.store.select(selectContainerManagerContainers);
  readonly containersCollectedAt$ = this.store.select(selectContainerManagerContainersCollectedAt);
  readonly networks$ = this.store.select(selectContainerManagerNetworks);
  readonly topologyNodes$ = this.store.select(selectContainerManagerTopologyNodes);
  readonly topologyEdges$ = this.store.select(selectContainerManagerTopologyEdges);
  readonly networksCollectedAt$ = this.store.select(selectContainerManagerNetworksCollectedAt);
  readonly selectedContainerId$ = this.store.select(selectContainerManagerSelectedContainerId);
  readonly selectedContainer$ = this.store.select(selectContainerManagerSelectedContainer);
  readonly statsHistoryPoints$ = this.store.select(selectContainerManagerStatsHistoryPoints);
  readonly logLines$ = this.store.select(selectContainerManagerLogLines);
  readonly logsCollectedAt$ = this.store.select(selectContainerManagerLogsCollectedAt);
  readonly logsTruncated$ = this.store.select(selectContainerManagerLogsTruncated);
  readonly loadingContainers$ = this.store.select(selectContainerManagerLoadingContainers);
  readonly loadingNetworks$ = this.store.select(selectContainerManagerLoadingNetworks);
  readonly loadingStatsHistory$ = this.store.select(selectContainerManagerLoadingStatsHistory);
  readonly loadingLogs$ = this.store.select(selectContainerManagerLoadingLogs);
  readonly loadingAny$ = this.store.select(selectContainerManagerLoadingAny);
  readonly error$ = this.store.select(selectContainerManagerError);

  enter(subscriptionId: string, itemId: string, adminMode = false): void {
    this.store.dispatch(enterContainerManager({ subscriptionId, itemId, adminMode }));
  }

  selectContainerById(containerId: string | null): void {
    this.store.dispatch(selectContainer({ containerId }));
  }

  clear(): void {
    this.store.dispatch(clearContainerManager());
  }
}
