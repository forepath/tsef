import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('billing_datev_debtor_accounts')
@Unique('uq_billing_datev_debtor_accounts_tenant_user', ['tenantId', 'userId'])
@Unique('uq_billing_datev_debtor_accounts_scope_debtor', ['allocationScope', 'debtorNumber'])
export class DatevDebtorAccountEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ type: 'varchar', length: 64, name: 'tenant_id' })
  tenantId!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  /** `__shared__` when TENANTS_SHARED_NUMBERS is enabled; otherwise the tenant id. */
  @Column({ type: 'varchar', length: 64, name: 'allocation_scope', default: '__shared__' })
  allocationScope!: string;

  @Column({ type: 'int', name: 'debtor_number' })
  debtorNumber!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
