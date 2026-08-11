import {
  isSubscriptionItemDetailEligible,
  isSubscriptionItemRemoved,
  resolveServiceDisplayLabel,
} from './service-display-label.util';

describe('resolveServiceDisplayLabel', () => {
  it('prefers trimmed displayName', () => {
    expect(
      resolveServiceDisplayLabel({
        displayName: '  My VPS  ',
        serviceTypeName: 'Standard',
        service: 'agenstra-controller',
      }),
    ).toBe('My VPS');
  });

  it('falls back to serviceTypeName when displayName is empty', () => {
    expect(
      resolveServiceDisplayLabel({
        displayName: '   ',
        serviceTypeName: 'Standard Plan',
        service: 'agenstra-controller',
      }),
    ).toBe('Standard Plan');
  });

  it('falls back to service when displayName and serviceTypeName are missing', () => {
    expect(
      resolveServiceDisplayLabel({
        displayName: null,
        serviceTypeName: null,
        service: 'decabill-billing',
      }),
    ).toBe('decabill-billing');
  });

  it('returns Service when no label fields are set', () => {
    expect(resolveServiceDisplayLabel({})).toBe('Service');
  });
});

describe('isSubscriptionItemDetailEligible', () => {
  it('returns true only for active items with hostname', () => {
    expect(isSubscriptionItemDetailEligible({ provisioningStatus: 'active', hostname: 'host1' })).toBe(true);
    expect(isSubscriptionItemDetailEligible({ provisioningStatus: 'active', hostname: '  ' })).toBe(false);
    expect(isSubscriptionItemDetailEligible({ provisioningStatus: 'active' })).toBe(false);
    expect(isSubscriptionItemDetailEligible({ provisioningStatus: 'pending', hostname: 'host1' })).toBe(false);
    expect(isSubscriptionItemDetailEligible({ provisioningStatus: 'failed', hostname: 'host1' })).toBe(false);
  });
});

describe('isSubscriptionItemRemoved', () => {
  it('treats failed and active-without-hostname items as removed', () => {
    expect(isSubscriptionItemRemoved({ provisioningStatus: 'failed' })).toBe(true);
    expect(isSubscriptionItemRemoved({ provisioningStatus: 'active' })).toBe(true);
    expect(isSubscriptionItemRemoved({ provisioningStatus: 'active', hostname: 'host1' })).toBe(false);
    expect(isSubscriptionItemRemoved({ provisioningStatus: 'pending' })).toBe(false);
  });
});
