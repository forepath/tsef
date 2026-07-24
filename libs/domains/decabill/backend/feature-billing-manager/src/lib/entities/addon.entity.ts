import { createJsonAes256GcmTransformer } from '@forepath/shared/backend';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

import { BillingIntervalType } from './service-plan.entity';

export type AddonImplementationType = 'module' | 'cloud_init_script';

@Entity('billing_addons')
@Unique('uq_billing_addons_tenant_key', ['tenantId', 'key'])
export class AddonEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ type: 'varchar', length: 64, name: 'tenant_id', default: 'default' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 100, name: 'key' })
  key!: string;

  @Column({ type: 'varchar', length: 255, name: 'name' })
  name!: string;

  @Column({ type: 'text', nullable: true, name: 'description' })
  description?: string;

  @Column({ type: 'varchar', length: 32, name: 'implementation_type' })
  implementationType!: AddonImplementationType;

  /** Registry key for DYNAMIC_ADDON_MODULES when implementationType is module. */
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'module_key' })
  moduleKey?: string | null;

  /** Script appended after primary cloud-init user-data when implementationType is cloud_init_script. */
  @Column({ type: 'text', nullable: true, name: 'script_template' })
  scriptTemplate?: string | null;

  /** JSON schema for addon config; `environmentVariables` drives admin defaults and order fields. */
  @Column({ type: 'jsonb', name: 'config_schema', default: () => "'{}'::jsonb" })
  configSchema!: Record<string, unknown>;

  @Column({
    type: 'text',
    nullable: true,
    name: 'config_default_values',
    transformer: createJsonAes256GcmTransformer(),
  })
  configDefaultValues?: Record<string, string>;

  /** Empty = compatible with all providers that support addons. */
  @Column({ type: 'jsonb', name: 'compatible_providers', default: () => "'[]'::jsonb" })
  compatibleProviders!: string[];

  @Column({ type: 'numeric', precision: 12, scale: 4, nullable: true, name: 'base_price' })
  basePrice?: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true, name: 'price_interval_type' })
  priceIntervalType?: BillingIntervalType | null;

  @Column({ type: 'int', nullable: true, name: 'price_interval_value' })
  priceIntervalValue?: number | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
