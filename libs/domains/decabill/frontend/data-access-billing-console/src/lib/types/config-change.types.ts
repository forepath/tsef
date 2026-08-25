/**
 * Mid-life configuration change of an active subscription.
 * Mirrors the backend contract in the billing manager OpenAPI spec.
 */

/** Stable machine-readable rejection codes returned by the config-change endpoints. */
export const CONFIG_CHANGE_ERROR_CODES = [
  'CONFIG_CHANGE_NOT_ELIGIBLE',
  'CONFIG_CHANGE_NOOP',
  'CONFIG_CHANGE_SERVER_TYPE_UNSUPPORTED',
  'CONFIG_CHANGE_SERVER_TYPE_LATERAL_UNSUPPORTED',
  'CONFIG_CHANGE_ADDON_INVALID',
  'CONFIG_CHANGE_ADDON_CONFIG_IMMUTABLE',
  'CONFIG_CHANGE_FAILED',
] as const;

export type ConfigChangeErrorCode = (typeof CONFIG_CHANGE_ERROR_CODES)[number];

export type ConfigChangeStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type ConfigChangeBillingOutcome = 'none' | 'charged' | 'credited' | 'deferred';

export type ConfigChangeDisclaimerKind = 'charge' | 'credit' | 'none';

export interface ConfigChangeRequest {
  /** Target provider server type; must be offered by the plan. Location is not changeable. */
  serverType?: string;
  addAddonIds?: string[];
  removeAddonIds?: string[];
  /** Per-addon config keyed by addon id; only allowed for addons being added. */
  addonConfigs?: Record<string, Record<string, string>>;
}

export interface ConfigChangeEligibility {
  canRequestChange: boolean;
  /** Populated when `canRequestChange` is false. */
  reasonCode?: ConfigChangeErrorCode | null;
  reason?: string | null;
  hasPendingChange: boolean;
  /** Effective cloud provider for this subscription (configSnapshot, then service-type primary). */
  provider?: string | null;
  currentServerType?: string | null;
  allowedServerTypes: string[];
  supportsServerTypeUpgrade: boolean;
  supportsServerTypeDowngrade: boolean;
  /** Addon ids the plan offers that are not active on the subscription yet. */
  availableAddonIds: string[];
  activeAddonIds: string[];
}

export interface ConfigChangeAmounts {
  currency: string;
  currentPeriodNet: number;
  newPeriodNet: number;
  periodDeltaNet: number;
  /** Prorated net settled with the change; positive is charged, negative is credited. */
  immediateAdjustmentNet: number;
  /** Share of the current billing period still unconsumed, in [0, 1]. */
  remainingPeriodRatio: number;
}

export interface ConfigChangeDisclaimer {
  kind: ConfigChangeDisclaimerKind;
  effectiveAt: string;
  notes: string[];
}

export interface ConfigChangeDiscount {
  redemptionId: string;
  code: string;
  advantageType: string;
  remainingBillingPeriods?: number | null;
  remainingAmountNet?: number | null;
}

export interface ConfigChangePreviewResponse {
  eligibility: ConfigChangeEligibility;
  amounts: ConfigChangeAmounts;
  disclaimer: ConfigChangeDisclaimer;
  /** Active promotions that keep applying after the change. */
  discounts: ConfigChangeDiscount[];
}

export interface ConfigChangeResponse {
  id: string;
  status: ConfigChangeStatus;
  errorCode?: string | null;
  errorMessage?: string | null;
  appliedSteps: string[];
  billingOutcome?: ConfigChangeBillingOutcome | null;
  requestedAt: string;
  processedAt?: string | null;
}

/** Normalized failure of a config-change call: raw message plus the stable code when present. */
export interface ConfigChangeFailure {
  message: string;
  code: ConfigChangeErrorCode | null;
}
