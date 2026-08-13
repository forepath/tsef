import { createJsonAes256GcmTransformer } from '@forepath/shared/backend';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

import type { CloudInitConfigServiceTabDefinition } from '../utils/service-detail-tabs.utils';

export type CloudInitProvisioningMode = 'simple' | 'compose-template' | 'user-data-template';

/** Ordered env var metadata for a CloudInit config template (defaults stored separately, encrypted). */
export interface CloudInitConfigEnvVariableDefinition {
  key: string;
  label: string;
  description?: string;
  showInOrderForm: boolean;
  hasDefault: boolean;
  useRandomDefault?: boolean;
  randomDefaultLength?: number;
  randomDefaultSpecialChars?: boolean;
}

export type { CloudInitConfigServiceTabDefinition };

@Entity('billing_cloud_init_configs')
@Unique('uq_billing_cloud_init_configs_tenant_key', ['tenantId', 'key'])
export class CloudInitConfigEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ type: 'varchar', length: 64, name: 'tenant_id', default: 'default' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 100, name: 'key' })
  key!: string;

  @Column({ type: 'varchar', length: 255, name: 'name' })
  name!: string;

  @Column({ type: 'varchar', length: 32, name: 'provisioning_mode', default: 'simple' })
  provisioningMode!: CloudInitProvisioningMode;

  @Column({ type: 'text', nullable: true, name: 'description' })
  description?: string;

  @Column({ type: 'varchar', length: 512, name: 'docker_image', nullable: true })
  dockerImage?: string | null;

  @Column({ type: 'int', name: 'container_port', default: 8080 })
  containerPort!: number;

  @Column({ type: 'int', name: 'host_port', default: 80 })
  hostPort!: number;

  @Column({ type: 'varchar', length: 255, name: 'work_dir', default: '/opt/custom-app' })
  workDir!: string;

  @Column({ type: 'text', nullable: true, name: 'docker_compose_template' })
  dockerComposeTemplate?: string | null;

  @Column({ type: 'text', nullable: true, name: 'user_data_template' })
  userDataTemplate?: string | null;

  @Column({ type: 'jsonb', name: 'environment_variables', default: () => "'[]'::jsonb" })
  environmentVariables!: CloudInitConfigEnvVariableDefinition[];

  /**
   * Declarative service-detail tabs for subscription items provisioned with this template.
   * Code modules (DYNAMIC_CLOUD_INIT_MODULES) may contribute additional tabs by config key.
   */
  @Column({ type: 'jsonb', name: 'service_tabs', default: () => "'[]'::jsonb" })
  serviceTabs!: CloudInitConfigServiceTabDefinition[];

  @Column({
    type: 'text',
    nullable: true,
    name: 'env_default_values',
    transformer: createJsonAes256GcmTransformer(),
  })
  envDefaultValues?: Record<string, string>;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
