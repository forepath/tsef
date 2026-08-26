/** Matches {@link PublicServicePlanOfferingDto} from the billing API. */

export type BillingIntervalType = 'hour' | 'day' | 'month' | 'year';

export interface ServicePlanOrderingHighlight {
  icon: string;
  text: string;
}

export interface WithdrawalPolicy {
  periodDays: number;
  allowedAfterProvisioning: boolean;
  unprovisionedAlwaysWithdrawable: true;
  provisionedRefundPolicy: 'unused_period_prorated';
}

export interface PublicServicePlanOffering {
  id: string;
  name: string;
  description: string | null;
  serviceTypeId: string | null;
  serviceTypeName: string;
  billingIntervalType: BillingIntervalType;
  billingIntervalValue: number;
  billInAdvance: boolean;
  autoRecalculatePriceDaily: boolean;
  totalPrice: number;
  totalGross: number;
  taxRate: number;
  totalPriceFrom?: number;
  totalGrossFrom?: number;
  orderingHighlights: ServicePlanOrderingHighlight[];
  allowCustomerLocationSelection?: boolean;
  allowCustomerServerTypeSelection: boolean;
  /** When true, checkout UIs may offer provider selection from allowedProviders. */
  allowCustomerProviderSelection: boolean;
  /** Provider ids customers may select when allowCustomerProviderSelection is true. */
  allowedProviders: string[];
  withdrawalPolicy: WithdrawalPolicy;
}

export interface PublicServicePlanOfferingsListParams {
  limit?: number;
  offset?: number;
  serviceTypeId?: string;
}
