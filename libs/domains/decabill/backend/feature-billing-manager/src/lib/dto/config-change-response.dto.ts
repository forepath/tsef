import type {
  SubscriptionConfigChangeBillingOutcome,
  SubscriptionConfigChangeStatus,
} from '../entities/subscription-config-change.entity';

/**
 * Status view of a config change run. Deliberately excludes `requestedPayload`,
 * which may contain addon secrets.
 */
export class ConfigChangeResponseDto {
  id!: string;
  status!: SubscriptionConfigChangeStatus;
  errorCode?: string | null;
  errorMessage?: string | null;
  appliedSteps!: string[];
  billingOutcome?: SubscriptionConfigChangeBillingOutcome | null;
  requestedAt!: Date;
  processedAt?: Date | null;
}
