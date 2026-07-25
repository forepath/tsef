/** Primary idempotency key for admin commercial plan-price migrations. */
export function planPriceMigratePrimarySourceRef(changeId: string, subscriptionId: string): string {
  return `plan_price_migrate:${changeId}:${subscriptionId}`;
}

/** Carry-forward credit open position idempotency key after a partial credit document. */
export function planPriceMigrateCarrySourceRef(changeId: string, subscriptionId: string): string {
  return `plan_price_migrate:${changeId}:${subscriptionId}:carry`;
}

/** Discriminators written to `billing_open_positions.adjustment_kind` by admin plan price migrate. */
export const PLAN_PRICE_MIGRATE_ADJUSTMENT_KINDS = {
  ARREAR: 'plan_price_migrate_arrear',
  CHARGE: 'plan_price_migrate_charge',
  CREDIT: 'plan_price_migrate_credit',
} as const;

/** Credit document reason for admin plan-price migrations. */
export const PLAN_PRICE_MIGRATE_CREDIT_REASON = 'plan_price_migrate';
