import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';

import { SupplierProfileEntity } from './supplier-profile.entity';

@Entity('billing_supplier_contracts')
@Unique('uq_billing_supplier_contracts_supplier_number', ['supplierId', 'contractNumber'])
export class SupplierContractEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ type: 'uuid', name: 'supplier_id' })
  supplierId!: string;

  @ManyToOne(() => SupplierProfileEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplier_id' })
  supplier?: SupplierProfileEntity;

  @Column({ type: 'varchar', length: 128, name: 'contract_number' })
  contractNumber!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
