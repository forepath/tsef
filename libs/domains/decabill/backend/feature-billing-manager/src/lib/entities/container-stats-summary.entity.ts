import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('billing_container_stats_summaries')
export class ContainerStatsSummaryEntity {
  @PrimaryColumn({ type: 'uuid', name: 'item_id' })
  itemId!: string;

  @Column({ type: 'varchar', length: 64, name: 'tenant_id', default: 'default' })
  tenantId!: string;

  @Column({ type: 'uuid', name: 'subscription_id' })
  subscriptionId!: string;

  @Column({ type: 'int', name: 'container_count', default: 0 })
  containerCount!: number;

  @Column({ type: 'int', name: 'healthy_count', default: 0 })
  healthyCount!: number;

  @Column({ type: 'timestamp', name: 'last_collected_at' })
  lastCollectedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
