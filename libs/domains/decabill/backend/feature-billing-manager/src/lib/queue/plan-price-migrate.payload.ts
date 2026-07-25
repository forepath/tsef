import type { TaxCategory } from '../constants/tax-category.constants';

export const PlanPriceMigrateJobName = {
  UNIT: 'plan-price-migrate.unit',
} as const;

export interface PlanCommercialPricingSnapshot {
  basePrice?: string | null;
  marginPercent?: string | null;
  marginFixed?: string | null;
  taxCategory: TaxCategory;
}

export interface PlanPriceMigrateUnitPayload {
  tenantId: string;
  planId: string;
  changeId: string;
  runDate: string;
  previousPricing: PlanCommercialPricingSnapshot;
}
