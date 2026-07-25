import type { ServicePlanEntity } from '../entities/service-plan.entity';
import type { SubscriptionEntity } from '../entities/subscription.entity';

/** Shared settlement outcomes for config-change and automatic price recalculation. */
export type PeriodPriceChangeBillingOutcome = 'charged' | 'credited' | 'none';

export interface PeriodPriceChangeSnapshot {
  currentPeriodNet: number;
  periodDeltaNet: number;
  immediateAdjustmentNet: number;
}

export interface PeriodPriceChangeAdjustmentKinds {
  ARREAR: string;
  CHARGE: string;
  CREDIT: string;
}

/**
 * Generic one-shot period price change settlement (config-change and price-recalc).
 * Amounts are frozen by the caller; this service never re-derives prices at apply time.
 */
export interface PeriodPriceChangeSettlementParams {
  subscription: SubscriptionEntity;
  plan: ServicePlanEntity;
  changedAt: Date;
  snapshot: PeriodPriceChangeSnapshot;
  primarySourceRef: string;
  carrySourceRef: string;
  adjustmentKinds: PeriodPriceChangeAdjustmentKinds;
  creditReason: string;
  description: string;
  creditLineDescription: string;
  auditProcess: string;
  auditIdKey: string;
  auditIdValue: string;
  /** When set, also scan legacy config-change OP/credit markers for idempotency. */
  legacyConfigChangeId?: string;
}
