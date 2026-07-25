import type {
  ConfigChangeEligibility,
  ConfigChangePreviewResponse,
  ConfigChangeResponse,
} from '../../types/config-change.types';

import {
  clearConfigChangePreview,
  loadConfigChangeEligibility,
  loadConfigChangeEligibilityFailure,
  loadConfigChangeEligibilitySuccess,
  previewConfigChange,
  previewConfigChangeFailure,
  previewConfigChangeSuccess,
  resetConfigChange,
  submitConfigChange,
  submitConfigChangeFailure,
  submitConfigChangeSuccess,
} from './subscription-config-change.actions';
import {
  initialSubscriptionConfigChangeState,
  subscriptionConfigChangeReducer,
} from './subscription-config-change.reducer';

describe('subscriptionConfigChangeReducer', () => {
  const subscriptionId = 'sub-1';
  const eligibility: ConfigChangeEligibility = {
    canRequestChange: true,
    hasPendingChange: false,
    allowedServerTypes: ['cx22', 'cx32'],
    supportsServerTypeUpgrade: true,
    supportsServerTypeDowngrade: true,
    availableAddonIds: ['addon-2'],
    activeAddonIds: ['addon-1'],
  };
  const preview: ConfigChangePreviewResponse = {
    eligibility: { ...eligibility, currentServerType: 'cx22' },
    amounts: {
      currency: 'EUR',
      currentPeriodNet: 10,
      newPeriodNet: 15,
      periodDeltaNet: 5,
      immediateAdjustmentNet: 2.5,
      remainingPeriodRatio: 0.5,
    },
    disclaimer: { kind: 'charge', effectiveAt: '2024-02-01T00:00:00Z', notes: ['note'] },
    discounts: [],
  };
  const result: ConfigChangeResponse = {
    id: 'run-1',
    status: 'pending',
    appliedSteps: [],
    requestedAt: '2024-01-01T00:00:00Z',
  };

  it('should track the subscription while eligibility loads', () => {
    const state = subscriptionConfigChangeReducer(
      initialSubscriptionConfigChangeState,
      loadConfigChangeEligibility({ subscriptionId }),
    );

    expect(state.subscriptionId).toBe(subscriptionId);
    expect(state.eligibilityLoading).toBe(true);
    expect(state.eligibilityError).toBeNull();
  });

  it('should store eligibility on success', () => {
    const state = subscriptionConfigChangeReducer(
      { ...initialSubscriptionConfigChangeState, eligibilityLoading: true },
      loadConfigChangeEligibilitySuccess({ subscriptionId, eligibility }),
    );

    expect(state.eligibility).toEqual(eligibility);
    expect(state.eligibilityLoading).toBe(false);
  });

  it('should clear eligibility on failure', () => {
    const state = subscriptionConfigChangeReducer(
      { ...initialSubscriptionConfigChangeState, eligibility, eligibilityLoading: true },
      loadConfigChangeEligibilityFailure({ error: 'nope', code: 'CONFIG_CHANGE_NOT_ELIGIBLE' }),
    );

    expect(state.eligibility).toBeNull();
    expect(state.eligibilityError).toBe('nope');
  });

  it('should reset preview errors when a new preview starts', () => {
    const state = subscriptionConfigChangeReducer(
      {
        ...initialSubscriptionConfigChangeState,
        previewError: 'stale',
        previewErrorCode: 'CONFIG_CHANGE_NOOP',
      },
      previewConfigChange({ subscriptionId, request: {} }),
    );

    expect(state.previewLoading).toBe(true);
    expect(state.previewError).toBeNull();
    expect(state.previewErrorCode).toBeNull();
  });

  it('should refresh eligibility from the preview response', () => {
    const state = subscriptionConfigChangeReducer(
      { ...initialSubscriptionConfigChangeState, previewLoading: true },
      previewConfigChangeSuccess({ preview }),
    );

    expect(state.preview).toEqual(preview);
    expect(state.eligibility).toEqual(preview.eligibility);
    expect(state.previewLoading).toBe(false);
  });

  it('should drop a stale preview when the new preview is rejected', () => {
    const state = subscriptionConfigChangeReducer(
      { ...initialSubscriptionConfigChangeState, preview, previewLoading: true },
      previewConfigChangeFailure({ error: 'Nothing would change', code: 'CONFIG_CHANGE_NOOP' }),
    );

    expect(state.preview).toBeNull();
    expect(state.previewError).toBe('Nothing would change');
    expect(state.previewErrorCode).toBe('CONFIG_CHANGE_NOOP');
  });

  it('should clear only preview data on clearConfigChangePreview', () => {
    const state = subscriptionConfigChangeReducer(
      { ...initialSubscriptionConfigChangeState, eligibility, preview, previewError: 'boom' },
      clearConfigChangePreview(),
    );

    expect(state.preview).toBeNull();
    expect(state.previewError).toBeNull();
    expect(state.eligibility).toEqual(eligibility);
  });

  it('should clear a previous result when submitting again', () => {
    const state = subscriptionConfigChangeReducer(
      { ...initialSubscriptionConfigChangeState, result, submitError: 'boom' },
      submitConfigChange({ subscriptionId, request: {} }),
    );

    expect(state.submitting).toBe(true);
    expect(state.result).toBeNull();
    expect(state.submitError).toBeNull();
  });

  it('should store the run on submit success', () => {
    const state = subscriptionConfigChangeReducer(
      { ...initialSubscriptionConfigChangeState, submitting: true },
      submitConfigChangeSuccess({ result }),
    );

    expect(state.result).toEqual(result);
    expect(state.submitting).toBe(false);
  });

  it('should keep the error code on submit failure', () => {
    const state = subscriptionConfigChangeReducer(
      { ...initialSubscriptionConfigChangeState, submitting: true },
      submitConfigChangeFailure({ error: 'not eligible', code: 'CONFIG_CHANGE_NOT_ELIGIBLE' }),
    );

    expect(state.submitting).toBe(false);
    expect(state.submitErrorCode).toBe('CONFIG_CHANGE_NOT_ELIGIBLE');
  });

  it('should return to the initial state on reset', () => {
    const state = subscriptionConfigChangeReducer(
      { ...initialSubscriptionConfigChangeState, eligibility, preview, result, submitError: 'boom' },
      resetConfigChange(),
    );

    expect(state).toEqual(initialSubscriptionConfigChangeState);
  });
});
