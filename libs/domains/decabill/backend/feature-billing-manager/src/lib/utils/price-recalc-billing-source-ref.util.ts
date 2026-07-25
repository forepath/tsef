/** Primary idempotency key for daily price-recalc open positions and credit documents. */
export function priceRecalcPrimarySourceRef(runDate: string, subscriptionId: string): string {
  return `price_recalc:${runDate}:${subscriptionId}`;
}

/** Carry-forward credit open position idempotency key after a partial credit document. */
export function priceRecalcCarrySourceRef(runDate: string, subscriptionId: string): string {
  return `price_recalc:${runDate}:${subscriptionId}:carry`;
}

/** Discriminators written to `billing_open_positions.adjustment_kind` by price recalc. */
export const PRICE_RECALC_ADJUSTMENT_KINDS = {
  ARREAR: 'price_recalc_arrear',
  CHARGE: 'price_recalc_charge',
  CREDIT: 'price_recalc_credit',
} as const;

/** Credit document reason for price-recalc credits (DATEV exports all reasons by withdrawn_at). */
export const PRICE_RECALC_CREDIT_REASON = 'price_recalc';
