import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

import type { ContainerManagerStatsHistoryPointDto } from '../contributors/container-manager/dto/container-manager.dto';

export type ContainerStatsSamplePayload = Omit<ContainerManagerStatsHistoryPointDto, 'timestamp'>;

@Entity('billing_container_stats_samples')
@Index('idx_billing_container_stats_samples_item_container_collected', ['itemId', 'containerId', 'collectedAt'])
export class ContainerStatsSampleEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ type: 'varchar', length: 64, name: 'tenant_id', default: 'default' })
  tenantId!: string;

  @Column({ type: 'uuid', name: 'subscription_id' })
  subscriptionId!: string;

  @Column({ type: 'uuid', name: 'item_id' })
  itemId!: string;

  @Column({ type: 'varchar', length: 64, name: 'container_id' })
  containerId!: string;

  @Column({ type: 'timestamp', name: 'collected_at' })
  collectedAt!: Date;

  @Column({ type: 'jsonb', name: 'stats' })
  stats!: ContainerStatsSamplePayload;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
