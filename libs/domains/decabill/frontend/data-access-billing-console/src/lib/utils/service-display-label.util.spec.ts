import {
  isSubscriptionItemDetailEligible,
  isSubscriptionItemRemoved,
  resolveServiceDisplayLabel,
  resolveSubscriptionItemProvisioningDisplayStatus,
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
    expect(
      isSubscriptionItemDetailEligible(
        { provisioningStatus: 'active', hasProviderReference: true, hostname: 'host1' },
        'pending_withdrawal',
      ),
    ).toBe(true);
    expect(
      isSubscriptionItemDetailEligible(
        { provisioningStatus: 'active', hasProviderReference: true, hostname: 'host1' },
        'pending_instant_cancel',
      ),
    ).toBe(true);
  });
});

describe('resolveSubscriptionItemProvisioningDisplayStatus', () => {
  it('shows removing while pending teardown still has a live provider', () => {
    expect(
      resolveSubscriptionItemProvisioningDisplayStatus(
        { provisioningStatus: 'active', hasProviderReference: true, hostname: 'host1' },
        'pending_withdrawal',
      ),
    ).toBe('removing');
    expect(
      resolveSubscriptionItemProvisioningDisplayStatus(
        { provisioningStatus: 'active', hasProviderReference: true, hostname: 'host1' },
        'pending_instant_cancel',
      ),
    ).toBe('removing');
  });

  it('shows removed for canceled subscriptions and torn-down items', () => {
    expect(
      resolveSubscriptionItemProvisioningDisplayStatus(
        { provisioningStatus: 'active', hasProviderReference: true, hostname: 'host1' },
        'canceled',
      ),
    ).toBe('removed');
    expect(
      resolveSubscriptionItemProvisioningDisplayStatus(
        { provisioningStatus: 'active', hasProviderReference: false, hostname: 'host1' },
        'active',
      ),
    ).toBe('removed');
    expect(
      resolveSubscriptionItemProvisioningDisplayStatus(
        { provisioningStatus: 'active', hasProviderReference: false },
        'pending_withdrawal',
      ),
    ).toBe('removed');
  });

  it('keeps failed as failed instead of removed', () => {
    expect(resolveSubscriptionItemProvisioningDisplayStatus({ provisioningStatus: 'failed' }, 'active')).toBe('failed');
  });

  it('returns the real provisioning status otherwise', () => {
    expect(
      resolveSubscriptionItemProvisioningDisplayStatus(
        { provisioningStatus: 'active', hasProviderReference: true, hostname: 'host1' },
        'active',
      ),
    ).toBe('active');
    expect(resolveSubscriptionItemProvisioningDisplayStatus({ provisioningStatus: 'pending' }, 'active')).toBe(
      'pending',
    );
  });
});

describe('isSubscriptionItemRemoved', () => {
  it('is true only for terminal/torn-down cases', () => {
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
    ).toBe(false);
    expect(isSubscriptionItemRemoved({ provisioningStatus: 'failed' }, 'active')).toBe(false);
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
