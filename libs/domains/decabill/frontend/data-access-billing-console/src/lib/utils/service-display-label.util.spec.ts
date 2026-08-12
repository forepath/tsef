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
  it('returns true only for accessible subscriptions with active items and a live provider', () => {
    expect(
      isSubscriptionItemDetailEligible(
        { provisioningStatus: 'active', hasProviderReference: true, hostname: 'host1' },
        'active',
      ),
    ).toBe(true);
    expect(
      isSubscriptionItemDetailEligible(
        { provisioningStatus: 'active', hasProviderReference: true, hostname: 'host1' },
        'pending_cancel',
      ),
    ).toBe(true);
    expect(
      isSubscriptionItemDetailEligible(
        { provisioningStatus: 'active', hasProviderReference: true, hostname: 'host1' },
        'canceled',
      ),
    ).toBe(false);
    expect(
      isSubscriptionItemDetailEligible(
        { provisioningStatus: 'active', hasProviderReference: false, hostname: 'host1' },
        'active',
      ),
    ).toBe(false);
    expect(isSubscriptionItemDetailEligible({ provisioningStatus: 'active', hostname: 'host1' }, 'active')).toBe(true);
    expect(isSubscriptionItemDetailEligible({ provisioningStatus: 'active', hostname: '  ' }, 'active')).toBe(false);
    expect(
      isSubscriptionItemDetailEligible(
        { provisioningStatus: 'pending', hasProviderReference: true, hostname: 'host1' },
        'active',
      ),
    ).toBe(false);
  });
});

describe('isSubscriptionItemRemoved', () => {
  it('treats terminal subscriptions, failed items, and torn-down active items as removed', () => {
    expect(
      isSubscriptionItemRemoved(
        { provisioningStatus: 'active', hasProviderReference: true, hostname: 'host1' },
        'canceled',
      ),
    ).toBe(true);
    expect(
      isSubscriptionItemRemoved(
        { provisioningStatus: 'active', hasProviderReference: true, hostname: 'host1' },
        'pending_withdrawal',
      ),
    ).toBe(true);
    expect(isSubscriptionItemRemoved({ provisioningStatus: 'failed' }, 'active')).toBe(true);
    expect(
      isSubscriptionItemRemoved(
        { provisioningStatus: 'active', hasProviderReference: false, hostname: 'host1' },
        'active',
      ),
    ).toBe(true);
    expect(isSubscriptionItemRemoved({ provisioningStatus: 'active' }, 'active')).toBe(true);
    expect(
      isSubscriptionItemRemoved(
        { provisioningStatus: 'active', hasProviderReference: true, hostname: 'host1' },
        'active',
      ),
    ).toBe(false);
    expect(isSubscriptionItemRemoved({ provisioningStatus: 'pending' }, 'active')).toBe(false);
  });
});
