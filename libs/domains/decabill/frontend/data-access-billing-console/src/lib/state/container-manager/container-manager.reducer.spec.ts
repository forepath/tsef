import type {
  ContainerManagerContainersResponse,
  ContainerManagerLogsResponse,
  ContainerManagerNetworksResponse,
  ContainerManagerStatsHistoryResponse,
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
import { containerManagerReducer, initialContainerManagerState } from './container-manager.reducer';

describe('containerManagerReducer', () => {
  const containersResponse: ContainerManagerContainersResponse = {
    containers: [
      {
        id: 'ctr-1',
        name: 'web',
        image: 'nginx',
        state: 'running',
        status: 'Up',
        createdAt: null,
        stats: null,
      },
    ],
    collectedAt: '2026-08-13T12:00:00.000Z',
  };
  const networksResponse: ContainerManagerNetworksResponse = {
    networks: [],
    topology: {
      nodes: [{ id: 'n1', label: 'web', kind: 'container' }],
      edges: [],
    },
    hostInterfaces: [],
    hostRoutes: [],
    collectedAt: '2026-08-13T12:00:00.000Z',
  };
  const statsResponse: ContainerManagerStatsHistoryResponse = {
    containerId: 'ctr-1',
    points: [
      {
        timestamp: '2026-08-13T11:00:00.000Z',
        cpuPercent: 10,
        memoryPercent: 20,
        memoryUsageBytes: 64 * 1024 * 1024,
        memoryLimitBytes: 512 * 1024 * 1024,
        blockReadBytes: null,
        blockWriteBytes: null,
        networkRxBytes: null,
        networkTxBytes: null,
      },
    ],
  };
  const logsResponse: ContainerManagerLogsResponse = {
    containerId: 'ctr-1',
    lines: ['2026-08-13T11:00:00Z ready'],
    collectedAt: '2026-08-13T12:00:00.000Z',
    truncated: true,
    tail: 200,
  };

  it('returns the initial state', () => {
    expect(containerManagerReducer(undefined, { type: 'UNKNOWN' } as never)).toEqual(initialContainerManagerState);
  });

  it('enters and loads containers and networks', () => {
    const entered = containerManagerReducer(
      initialContainerManagerState,
      enterContainerManager({ subscriptionId: 'sub-1', itemId: 'item-1', adminMode: true }),
    );
    const withContainers = containerManagerReducer(entered, loadContainersSuccess({ response: containersResponse }));
    const withNetworks = containerManagerReducer(withContainers, loadNetworksSuccess({ response: networksResponse }));

    expect(entered.loadingContainers).toBe(true);
    expect(entered.loadingNetworks).toBe(true);
    expect(entered.adminMode).toBe(true);
    expect(withContainers.containers).toHaveLength(1);
    expect(withContainers.selectedContainerId).toBe('ctr-1');
    expect(withNetworks.topologyNodes).toHaveLength(1);
    expect(withNetworks.loadingNetworks).toBe(false);
  });

  it('stores failures and clears state', () => {
    const withContext = containerManagerReducer(
      initialContainerManagerState,
      enterContainerManager({ subscriptionId: 'sub-1', itemId: 'item-1' }),
    );
    const containersFailed = containerManagerReducer(
      withContext,
      loadContainersFailure({ error: 'containers failed' }),
    );
    const networksFailed = containerManagerReducer(withContext, loadNetworksFailure({ error: 'networks failed' }));
    const cleared = containerManagerReducer(containersFailed, clearContainerManager());

    expect(containersFailed.error).toBe('containers failed');
    expect(networksFailed.error).toBe('networks failed');
    expect(cleared).toEqual(initialContainerManagerState);
  });

  it('loads stats history for selected container', () => {
    const loading = containerManagerReducer(
      { ...initialContainerManagerState, subscriptionId: 'sub-1', itemId: 'item-1' },
      loadStatsHistory({ containerId: 'ctr-1' }),
    );
    const loaded = containerManagerReducer(loading, loadStatsHistorySuccess({ response: statsResponse }));
    const failed = containerManagerReducer(loading, loadStatsHistoryFailure({ error: 'stats failed' }));
    const selected = containerManagerReducer(loaded, selectContainer({ containerId: 'ctr-2' }));

    expect(loading.loadingStatsHistory).toBe(true);
    expect(loaded.statsHistoryPoints).toHaveLength(1);
    expect(failed.error).toBe('stats failed');
    expect(selected.selectedContainerId).toBe('ctr-2');
  });

  it('loads logs for selected container', () => {
    const loading = containerManagerReducer(
      { ...initialContainerManagerState, subscriptionId: 'sub-1', itemId: 'item-1' },
      loadLogs({ containerId: 'ctr-1' }),
    );
    const loaded = containerManagerReducer(loading, loadLogsSuccess({ response: logsResponse }));
    const silentFailed = containerManagerReducer(loaded, loadLogsFailure({ error: 'logs failed', silent: true }));
    const failed = containerManagerReducer(loading, loadLogsFailure({ error: 'logs failed' }));
    const selectedOther = containerManagerReducer(loaded, selectContainer({ containerId: 'ctr-2' }));

    expect(loading.loadingLogs).toBe(true);
    expect(loaded.logLines).toEqual(['2026-08-13T11:00:00Z ready']);
    expect(loaded.logsTruncated).toBe(true);
    expect(silentFailed.error).toBeNull();
    expect(failed.error).toBe('logs failed');
    expect(selectedOther.logLines).toEqual([]);
  });
});
