import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { InvoiceEntity } from './invoice.entity';
import { SubscriptionEntity } from './subscription.entity';

@Entity('billing_open_positions')
export class OpenPositionEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ type: 'uuid', name: 'subscription_id' })
  subscriptionId!: string;

  @ManyToOne(() => SubscriptionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscription_id' })
  subscription?: SubscriptionEntity;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'description' })
  description?: string;

  @Column({ type: 'timestamp', name: 'bill_until' })
  billUntil!: Date;

  @Column({ type: 'boolean', name: 'skip_if_no_billable_amount', default: true })
  skipIfNoBillableAmount!: boolean;

  /** Signed net adjustment (positive = extra charge, negative = credit) for non-recurring corrections. */
  @Column({ type: 'numeric', precision: 12, scale: 4, nullable: true, name: 'adjustment_net' })
  adjustmentNet?: string | null;

  /** Discriminator for the adjustment source, e.g. `config_change_server_type`. */
  @Column({ type: 'varchar', length: 64, nullable: true, name: 'adjustment_kind' })
  adjustmentKind?: string | null;

  /** Durable idempotency key for one-shot billing side effects (e.g. `config_change:{changeId}`). */
  @Column({ type: 'varchar', length: 128, nullable: true, name: 'source_ref' })
  sourceRef?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'uuid', nullable: true, name: 'invoice_ref_id' })
  invoiceRefId?: string;

  @ManyToOne(() => InvoiceEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'invoice_ref_id' })
  invoice?: InvoiceEntity;
}
