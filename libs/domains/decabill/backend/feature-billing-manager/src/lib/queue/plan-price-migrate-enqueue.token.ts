import type { PlanPriceMigrateUnitPayload } from './plan-price-migrate.payload';

export const PLAN_PRICE_MIGRATE_ENQUEUE = Symbol('PLAN_PRICE_MIGRATE_ENQUEUE');

export interface PlanPriceMigrateEnqueuePort {
  enqueueUnit(payload: PlanPriceMigrateUnitPayload): Promise<void>;
}
