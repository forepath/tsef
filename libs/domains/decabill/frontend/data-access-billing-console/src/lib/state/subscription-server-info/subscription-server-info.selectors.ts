import { createFeatureSelector, createSelector } from '@ngrx/store';

import type {
  ProvisioningServiceKind,
  ProvisioningStatus,
  ServerInfoResponse,
  SubscriptionResponse,
} from '../../types/billing.types';
import { selectSubscriptionsEntities } from '../subscriptions/subscriptions.selectors';

import type { ServerActionType, SubscriptionServerInfoState } from './subscription-server-info.reducer';

export interface SubscriptionWithServerInfo {
  subscription: SubscriptionResponse;
  serverInfo?: ServerInfoResponse;
  itemId: string;
  /** Product service from active item config. Defaults to agenstra-controller. */
  service: ProvisioningServiceKind;
  provisioningStatus: ProvisioningStatus;
  /** True after the customer has revealed the provisioning SSH private key at least once. */
  sshAccessGranted: boolean;
  /** User-facing service type name from the catalog. */
  serviceTypeName?: string;
}

const selectSubscriptionServerInfoState = createFeatureSelector<SubscriptionServerInfoState>('subscriptionServerInfo');

export const selectServerInfoBySubscriptionId = createSelector(
  selectSubscriptionServerInfoState,
  (state) => state.serverInfoBySubscriptionId,
);

export const selectActiveItemIdBySubscriptionId = createSelector(
  selectSubscriptionServerInfoState,
  (state) => state.activeItemIdBySubscriptionId,
);

export const selectServiceBySubscriptionId = createSelector(
  selectSubscriptionServerInfoState,
  (state) => state.serviceBySubscriptionId,
);

export const selectProvisioningStatusBySubscriptionId = createSelector(
  selectSubscriptionServerInfoState,
  (state) => state.provisioningStatusBySubscriptionId,
);

export const selectSshAccessGrantedBySubscriptionId = createSelector(
  selectSubscriptionServerInfoState,
  (state) => state.sshAccessGrantedBySubscriptionId,
);

export const selectServiceTypeNameBySubscriptionId = createSelector(
  selectSubscriptionServerInfoState,
  (state) => state.serviceTypeNameBySubscriptionId,
);

export const selectOverviewServerInfoLoading = createSelector(
  selectSubscriptionServerInfoState,
  (state) => state.loading,
);

export const selectOverviewServerInfoError = createSelector(selectSubscriptionServerInfoState, (state) => state.error);

export const selectBillingStatusHistory = createSelector(
  selectSubscriptionServerInfoState,
  (state) => state.billingStatusHistory,
);

export const selectServerActionInProgress = createSelector(
  selectSubscriptionServerInfoState,
  (state) => state.actionInProgress,
);

export const selectServerActionInProgressForSubscriptionId = (subscriptionId: string) =>
  createSelector(
    selectServerActionInProgress,
    (actionInProgress): ServerActionType | undefined => actionInProgress[subscriptionId],
  );

export const selectSubscriptionsWithServerInfo = createSelector(
  selectSubscriptionsEntities,
  selectServerInfoBySubscriptionId,
  selectActiveItemIdBySubscriptionId,
  selectServiceBySubscriptionId,
  selectProvisioningStatusBySubscriptionId,
  selectSshAccessGrantedBySubscriptionId,
  selectServiceTypeNameBySubscriptionId,
  (
    subscriptions,
    serverInfoBySubscriptionId,
    activeItemIdBySubscriptionId,
    serviceBySubscriptionId,
    provisioningStatusBySubscriptionId,
    sshAccessGrantedBySubscriptionId,
    serviceTypeNameBySubscriptionId,
  ): SubscriptionWithServerInfo[] =>
    subscriptions
      .filter((sub) => sub.status === 'active' && activeItemIdBySubscriptionId[sub.id] != null)
      .map((subscription) => ({
        subscription,
        serverInfo: serverInfoBySubscriptionId[subscription.id],
        itemId: activeItemIdBySubscriptionId[subscription.id],
        service: serviceBySubscriptionId[subscription.id] ?? 'agenstra-controller',
        provisioningStatus: provisioningStatusBySubscriptionId[subscription.id] ?? 'active',
        sshAccessGranted: sshAccessGrantedBySubscriptionId[subscription.id] === true,
        serviceTypeName: serviceTypeNameBySubscriptionId[subscription.id],
      })),
);
