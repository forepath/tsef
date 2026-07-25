import { createJsonAes256GcmTransformer } from '@forepath/shared/backend';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { SubscriptionEntity } from './subscription.entity';

export type SubscriptionConfigChangeStatus = 'pending' | 'processing' | 'completed' | 'failed';

/** How the config change settled financially once the worker finished applying it. */
export type SubscriptionConfigChangeBillingOutcome = 'none' | 'charged' | 'credited' | 'deferred';

/**
 * Customer-requested changes for one config-change run. Persisted encrypted because
 * addon configs may carry credentials.
 */
export interface SubscriptionConfigChangeRequestedPayload {
  serverType?: string;
  addAddonIds?: string[];
  removeAddonIds?: string[];
  addonConfigs?: Record<string, Record<string, string>>;
}

/** Frozen billing preview shown to (and accepted by) the customer at submit time. */
export interface SubscriptionConfigChangeDisclaimerSnapshot {
  currentPeriodNet: number;
  newPeriodNet: number;
  periodDeltaNet: number;
  immediateAdjustmentNet: number;
  currency: string;
  effectiveAt: string;
  notes: string[];
}

@Entity('billing_subscription_config_changes')
export class SubscriptionConfigChangeEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ type: 'uuid', name: 'subscription_id' })
  subscriptionId!: string;

  @ManyToOne(() => SubscriptionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscription_id' })
  subscription?: SubscriptionEntity;

  @Column({ type: 'varchar', length: 32, name: 'status', default: 'pending' })
  status!: SubscriptionConfigChangeStatus;

  /** Requested change payload; encrypted at rest via AES-256-GCM. */
  @Column({
    type: 'text',
    name: 'requested_payload',
    nullable: true,
    transformer: createJsonAes256GcmTransformer(),
  })
  requestedPayload!: SubscriptionConfigChangeRequestedPayload;

  @Column({ type: 'jsonb', nullable: true, name: 'billing_disclaimer_snapshot' })
  billingDisclaimerSnapshot?: SubscriptionConfigChangeDisclaimerSnapshot | null;

  /** Idempotency ledger of completed worker steps so retries can resume mid-flight. */
  @Column({ type: 'jsonb', name: 'applied_steps', default: () => "'[]'::jsonb" })
  appliedSteps!: string[];

  @Column({ type: 'varchar', length: 32, nullable: true, name: 'billing_outcome' })
  billingOutcome?: SubscriptionConfigChangeBillingOutcome | null;

  /** Number of times a stuck `processing` row was reclaimed by the watchdog. */
  @Column({ type: 'int', name: 'reclaim_count', default: 0 })
  reclaimCount!: number;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'error_code' })
  errorCode?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'error_message' })
  errorMessage?: string | null;

  @Column({ type: 'timestamptz', name: 'requested_at', default: () => 'now()' })
  requestedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'processed_at' })
  processedAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'processing_started_at' })
  processingStartedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
