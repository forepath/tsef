import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('billing_datev_creditor_accounts')
@Unique('uq_billing_datev_creditor_accounts_tenant_supplier', ['tenantId', 'supplierId'])
@Unique('uq_billing_datev_creditor_accounts_scope_creditor', ['allocationScope', 'creditorNumber'])
export class DatevCreditorAccountEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ type: 'varchar', length: 64, name: 'tenant_id' })
  tenantId!: string;

  @Column({ type: 'uuid', name: 'supplier_id' })
  supplierId!: string;

  /** `__shared__` when TENANTS_SHARED_NUMBERS is enabled; otherwise the tenant id. */
  @Column({ type: 'varchar', length: 64, name: 'allocation_scope', default: '__shared__' })
  allocationScope!: string;

  @Column({ type: 'int', name: 'creditor_number' })
  creditorNumber!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
