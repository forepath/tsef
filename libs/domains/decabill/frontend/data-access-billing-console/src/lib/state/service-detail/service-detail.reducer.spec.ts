import type { SubscriptionItemDetailResponse, SubscriptionMeterHistory } from '../../types/billing.types';

import {
  applyFilters,
  clearServiceDetail,
  enterServiceDetail,
  loadDetailFailure,
  loadDetailSuccess,
  loadHistory,
  loadHistoryFailure,
  loadHistorySuccess,
  markServiceDetailSshAccessGranted,
  meterSummaryPush,
  resetFilters,
  updateDisplayName,
  updateDisplayNameFailure,
  updateDisplayNameSuccess,
} from './service-detail.actions';
import { DEFAULT_METER_HISTORY_FILTERS } from './service-detail.constants';
import { initialServiceDetailState, serviceDetailReducer } from './service-detail.reducer';

describe('serviceDetailReducer', () => {
  const detail: SubscriptionItemDetailResponse = {
    id: 'item-1',
    subscriptionId: 'sub-1',
    serviceTypeId: 'st-1',
    serviceTypeName: 'Standard',
    displayName: 'My VPS',
    provisioningStatus: 'active',
    sshAccessGranted: true,
  };
  const history: SubscriptionMeterHistory = {
    subscriptionId: 'sub-1',
    from: '2026-01-01',
    to: '2026-01-31',
    groupBy: 'day',
    meters: [],
  };

  it('returns the initial state', () => {
    expect(serviceDetailReducer(undefined, { type: 'UNKNOWN' } as never)).toEqual(initialServiceDetailState);
  });

  it('loads detail and history on enter', () => {
    const entered = serviceDetailReducer(
      initialServiceDetailState,
      enterServiceDetail({ subscriptionId: 'sub-1', itemId: 'item-1' }),
    );
    const loadedDetail = serviceDetailReducer(entered, loadDetailSuccess({ detail }));
    const loadedHistory = serviceDetailReducer(loadedDetail, loadHistorySuccess({ history }));

    expect(entered.loadingDetail).toBe(true);
    expect(entered.loadingHistory).toBe(true);
    expect(loadedDetail.detail).toEqual(detail);
    expect(loadedHistory.history).toEqual(history);
  });

  it('stores failures and renaming state', () => {
    const detailFailed = serviceDetailReducer(
      { ...initialServiceDetailState, loadingDetail: true },
      loadDetailFailure({ error: 'Detail failed' }),
    );
    const historyFailed = serviceDetailReducer(
      { ...initialServiceDetailState, loadingHistory: true },
      loadHistoryFailure({ error: 'History failed' }),
    );
    const renaming = serviceDetailReducer(
      { ...initialServiceDetailState, detail },
      updateDisplayName({ subscriptionId: 'sub-1', itemId: 'item-1', displayName: 'Renamed' }),
    );
    const renamed = serviceDetailReducer(
      renaming,
      updateDisplayNameSuccess({ subscriptionId: 'sub-1', itemId: 'item-1', displayName: 'Renamed' }),
    );
    const renameFailed = serviceDetailReducer(renaming, updateDisplayNameFailure({ error: 'Rename failed' }));

    expect(detailFailed.error).toBe('Detail failed');
    expect(historyFailed.error).toBe('History failed');
    expect(renaming.renaming).toBe(true);
    expect(renamed.detail?.displayName).toBe('Renamed');
    expect(renameFailed.renaming).toBe(false);
  });

  it('applies filters and socket meter overlay', () => {
    const filters = { from: '2026-02-01', to: '2026-02-28', groupBy: 'month' as const };
    const withContext = serviceDetailReducer(
      initialServiceDetailState,
      enterServiceDetail({ subscriptionId: 'sub-1', itemId: 'item-1' }),
    );
    const filtered = serviceDetailReducer(withContext, applyFilters({ filters }));
    const reset = serviceDetailReducer(filtered, resetFilters({}));
    const socketUpdated = serviceDetailReducer(
      withContext,
      meterSummaryPush({
        subscriptionId: 'sub-1',
        meters: [
          {
            meterId: 'meter-1',
            key: 'api_calls',
            name: 'API Calls',
            aggregator: 'sum',
            attachmentType: 'plan',
            effectiveUnitPriceNet: 0.01,
            effectiveIncludedUsage: 0,
            aggregatedValue: 10,
            billableValue: 10,
            estimatedChargeNet: 0.1,
            entryCount: 1,
          },
        ],
      }),
    );
    const cleared = serviceDetailReducer(withContext, clearServiceDetail());

    expect(filtered.filters).toEqual(filters);
    expect(filtered.loadingHistory).toBe(true);
    expect(reset.filters).toEqual(DEFAULT_METER_HISTORY_FILTERS);
    expect(socketUpdated.metersFromSocket).toHaveLength(1);
    expect(cleared).toEqual(initialServiceDetailState);
  });

  it('ignores socket meter updates for other subscriptions', () => {
    const withContext = serviceDetailReducer(
      initialServiceDetailState,
      enterServiceDetail({ subscriptionId: 'sub-1', itemId: 'item-1' }),
    );
    const unchanged = serviceDetailReducer(withContext, meterSummaryPush({ subscriptionId: 'sub-2', meters: [] }));

    expect(unchanged.metersFromSocket).toBeNull();
  });

  it('marks sshAccessGranted on the loaded detail', () => {
    const withDetail = serviceDetailReducer(
      { ...initialServiceDetailState, detail: { ...detail, sshAccessGranted: false } },
      markServiceDetailSshAccessGranted(),
    );

    expect(withDetail.detail?.sshAccessGranted).toBe(true);
  });

  it('reloads history when loadHistory is dispatched', () => {
    const loading = serviceDetailReducer(
      initialServiceDetailState,
      loadHistory({ subscriptionId: 'sub-1', filters: DEFAULT_METER_HISTORY_FILTERS }),
    );

    expect(loading.loadingHistory).toBe(true);
    expect(loading.filters).toEqual(DEFAULT_METER_HISTORY_FILTERS);
  });
});
