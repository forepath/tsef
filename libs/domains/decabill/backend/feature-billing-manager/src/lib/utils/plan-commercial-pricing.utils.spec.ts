import { TaxCategory } from '../constants/tax-category.constants';
import { BillingIntervalType, type ServicePlanEntity } from '../entities/service-plan.entity';

import { commercialPricingFieldsChanged, snapshotCommercialPricing } from './plan-commercial-pricing.utils';

describe('plan-commercial-pricing.utils', () => {
  const plan = {
    id: 'plan-1',
    serviceTypeId: 'st-1',
    name: 'Pro',
    billingIntervalType: BillingIntervalType.MONTH,
    billingIntervalValue: 1,
    cancelAtPeriodEnd: true,
    billInAdvance: false,
    autoRecalculatePriceDaily: false,
    minCommitmentDays: 0,
    noticeDays: 0,
    basePrice: '10.0000',
    marginPercent: '5',
    marginFixed: '1',
    providerConfigDefaults: {},
    orderingHighlights: [],
    allowCustomerLocationSelection: false,
    allowCustomerServerTypeSelection: false,
    allowedServerTypes: [],
    taxCategory: TaxCategory.STANDARD,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as ServicePlanEntity;

  it('snapshots commercial pricing fields', () => {
    expect(snapshotCommercialPricing(plan)).toEqual({
      basePrice: '10.0000',
      marginPercent: '5',
      marginFixed: '1',
      taxCategory: TaxCategory.STANDARD,
    });
  });

  it('detects base price, margin, and tax category changes', () => {
    expect(commercialPricingFieldsChanged(plan, { basePrice: '11' })).toBe(true);
    expect(commercialPricingFieldsChanged(plan, { marginPercent: '6' })).toBe(true);
    expect(commercialPricingFieldsChanged(plan, { marginFixed: '2' })).toBe(true);
    expect(commercialPricingFieldsChanged(plan, { taxCategory: TaxCategory.REDUCED })).toBe(true);
    expect(commercialPricingFieldsChanged(plan, { basePrice: '10', marginPercent: '5', marginFixed: '1' })).toBe(false);
    expect(commercialPricingFieldsChanged(plan, { name: 'Other' })).toBe(false);
  });
});
