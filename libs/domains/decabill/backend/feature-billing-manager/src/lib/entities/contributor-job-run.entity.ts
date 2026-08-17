import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

@Entity('billing_contributor_job_runs')
@Unique('uq_billing_contributor_job_runs_identity', ['tenantId', 'source', 'sourceKey', 'jobKey'])
export class ContributorJobRunEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ type: 'varchar', length: 64, name: 'tenant_id', default: 'default' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 32, name: 'source' })
  source!: string;

  @Column({ type: 'varchar', length: 100, name: 'source_key' })
  sourceKey!: string;

  @Column({ type: 'varchar', length: 64, name: 'job_key' })
  jobKey!: string;

  @Column({ type: 'timestamp', nullable: true, name: 'last_started_at' })
  lastStartedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'last_finished_at' })
  lastFinishedAt!: Date | null;

  /** Generic failure marker only — never SSH output, keys, or plugin payloads. */
  @Column({ type: 'varchar', length: 128, nullable: true, name: 'last_error' })
  lastError!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
