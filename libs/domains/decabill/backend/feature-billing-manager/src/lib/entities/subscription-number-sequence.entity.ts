import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('billing_subscription_number_sequences')
export class SubscriptionNumberSequenceEntity {
  @PrimaryColumn({ type: 'varchar', length: 64, name: 'scope_key' })
  scopeKey!: string;

  @Column({ type: 'int', default: 0, name: 'last_value' })
  lastValue!: number;
}
