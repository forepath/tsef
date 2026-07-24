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

import { AddonEntity } from './addon.entity';
import { BillingIntervalType } from './service-plan.entity';
import { SubscriptionEntity } from './subscription.entity';

export type SubscriptionAddonStatus = 'pending' | 'active' | 'failed' | 'tearing_down' | 'inactive';

@Entity('billing_subscription_addons')
export class SubscriptionAddonEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ type: 'uuid', name: 'subscription_id' })
  subscriptionId!: string;

  @ManyToOne(() => SubscriptionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscription_id' })
  subscription?: SubscriptionEntity;

  @Column({ type: 'uuid', name: 'addon_id' })
  addonId!: string;

  @ManyToOne(() => AddonEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'addon_id' })
  addon?: AddonEntity;

  @Column({ type: 'varchar', length: 32, name: 'status', default: 'pending' })
  status!: SubscriptionAddonStatus;

  @Column({
    type: 'text',
    nullable: true,
    name: 'config_snapshot',
    transformer: createJsonAes256GcmTransformer(),
  })
  configSnapshot?: Record<string, unknown>;

  /** Period-normalized unit price snapshot at order time (plan billing period). */
  @Column({ type: 'numeric', precision: 12, scale: 4, nullable: true, name: 'unit_price_snapshot' })
  unitPriceSnapshot?: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true, name: 'price_interval_type' })
  priceIntervalType?: BillingIntervalType | null;

  @Column({ type: 'int', nullable: true, name: 'price_interval_value' })
  priceIntervalValue?: number | null;

  /** Addon display name snapshot for invoices after catalog changes. */
  @Column({ type: 'varchar', length: 255, name: 'addon_name_snapshot' })
  addonNameSnapshot!: string;

  @Column({ type: 'timestamptz', nullable: true, name: 'activated_at' })
  activatedAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'deactivated_at' })
  deactivatedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
