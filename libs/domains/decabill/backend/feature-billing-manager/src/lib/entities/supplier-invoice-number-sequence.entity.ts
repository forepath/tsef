import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('billing_supplier_invoice_number_sequences')
export class SupplierInvoiceNumberSequenceEntity {
  @PrimaryColumn({ type: 'varchar', length: 64, name: 'tenant_id', default: 'default' })
  tenantId!: string;

  @PrimaryColumn({ type: 'int', name: 'year' })
  year!: number;

  @Column({ type: 'int', default: 0, name: 'last_value' })
  lastValue!: number;
}
