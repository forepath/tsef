import type { ConfigChangeErrorCode } from '../constants/config-change-error.constants';

export class ConfigChangeEligibilityDto {
  canRequestChange!: boolean;
  /** Populated when `canRequestChange` is false. */
  reasonCode?: ConfigChangeErrorCode;
  reason?: string;
  hasPendingChange!: boolean;
  /** Effective cloud provider for this subscription (configSnapshot, then service-type primary). */
  provider?: string;
  currentServerType?: string;
  allowedServerTypes!: string[];
  supportsServerTypeUpgrade!: boolean;
  supportsServerTypeDowngrade!: boolean;
  /** Addon IDs the plan offers and that are not active on the subscription yet. */
  availableAddonIds!: string[];
  activeAddonIds!: string[];
}

export class ConfigChangeAmountsDto {
  currency!: string;
  /** Net price of one billing period under the current configuration. */
  currentPeriodNet!: number;
  /** Net price of one billing period after the change. */
  newPeriodNet!: number;
  periodDeltaNet!: number;
  /**
   * Prorated net amount settled at the time of the change: positive is charged,
   * negative is credited back to the customer.
   */
  immediateAdjustmentNet!: number;
  /** Share of the current billing period still unconsumed, in [0, 1]. */
  remainingPeriodRatio!: number;
}

export class ConfigChangeDisclaimerDto {
  kind!: 'charge' | 'credit' | 'none';
  effectiveAt!: Date;
  notes!: string[];
}

export class ConfigChangeDiscountDto {
  redemptionId!: string;
  code!: string;
  advantageType!: string;
  remainingBillingPeriods?: number | null;
  remainingAmountNet?: number | null;
}

export class ConfigChangePreviewResponseDto {
  eligibility!: ConfigChangeEligibilityDto;
  amounts!: ConfigChangeAmountsDto;
  disclaimer!: ConfigChangeDisclaimerDto;
  /** Active promotions that keep applying after the change. */
  discounts!: ConfigChangeDiscountDto[];
}
