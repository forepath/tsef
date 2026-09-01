import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { CustomerType } from '../constants/customer-type.constants';
import { InvoiceStatus } from '../constants/invoice-status.constants';
import { SupplierDocumentSource } from '../constants/supplier-document-source.constants';
import { EinvoiceTaxCategoryCode, TaxMode } from '../constants/tax-mode.constants';

import { SupplierContractEntity } from './supplier-contract.entity';
import { SupplierInvoiceLineItemEntity } from './supplier-invoice-line-item.entity';
import { SupplierProfileEntity } from './supplier-profile.entity';

@Entity('billing_supplier_invoices')
export class SupplierInvoiceEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ type: 'uuid', name: 'supplier_id' })
  supplierId!: string;

  @ManyToOne(() => SupplierProfileEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supplier_id' })
  supplier?: SupplierProfileEntity;

  @Column({ type: 'uuid', name: 'contract_id', nullable: true })
  contractId?: string | null;

  @ManyToOne(() => SupplierContractEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'contract_id' })
  contract?: SupplierContractEntity | null;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'invoice_number' })
  invoiceNumber?: string;

  @Column({ type: 'enum', enum: InvoiceStatus, enumName: 'invoice_status_enum', default: InvoiceStatus.DRAFT })
  status!: InvoiceStatus;

  @Column({ type: 'varchar', length: 10, default: 'EUR', name: 'currency' })
  currency!: string;

  @Column({ type: 'decimal', precision: 12, scale: 4, default: 0, name: 'subtotal_net' })
  subtotalNet!: number;

  @Column({ type: 'decimal', precision: 12, scale: 4, default: 0, name: 'tax_total' })
  taxTotal!: number;

  @Column({ type: 'decimal', precision: 12, scale: 4, default: 0, name: 'total_gross' })
  totalGross!: number;

  @Column({ type: 'decimal', precision: 12, scale: 4, default: 0, name: 'balance_due' })
  balanceDue!: number;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'tax_mode' })
  taxMode?: TaxMode | null;

  @Column({ type: 'varchar', length: 2, nullable: true, name: 'tax_country_code' })
  taxCountryCode?: string | null;

  @Column({ type: 'text', nullable: true, name: 'tax_note' })
  taxNote?: string | null;

  @Column({ type: 'varchar', length: 8, nullable: true, name: 'einvoice_tax_category_code' })
  einvoiceTaxCategoryCode?: EinvoiceTaxCategoryCode | string | null;

  @Column({ type: 'decimal', precision: 8, scale: 4, nullable: true, name: 'resolved_tax_rate' })
  resolvedTaxRate?: number | null;

  @Column({ type: 'varchar', length: 32, nullable: true, name: 'supplier_vat_id' })
  supplierVatId?: string | null;

  @Column({ type: 'varchar', length: 2, nullable: true, name: 'supplier_country' })
  supplierCountry?: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true, name: 'supplier_customer_type' })
  supplierCustomerType?: CustomerType | null;

  @Column({ type: 'varchar', length: 2, nullable: true, name: 'recipient_country' })
  recipientCountry?: string | null;

  @Column({ type: 'boolean', nullable: true, name: 'recipient_is_in_eu' })
  recipientIsInEu?: boolean | null;

  /** Calendar issue date set by admin (or eInvoice prefill); required to archive. */
  @Column({ type: 'date', nullable: true, name: 'issue_date' })
  issueDate?: string | null;

  @Column({ type: 'date', nullable: true, name: 'due_date' })
  dueDate?: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'issued_at' })
  issuedAt?: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'voided_at' })
  voidedAt?: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'paid_at' })
  paidAt?: Date | null;

  @Column({ type: 'varchar', length: 512, nullable: true, name: 'document_storage_key' })
  documentStorageKey?: string | null;

  @Column({
    type: 'varchar',
    length: 16,
    nullable: true,
    name: 'document_source',
  })
  documentSource?: SupplierDocumentSource | null;

  @Column({ type: 'boolean', name: 'has_uploaded_document', default: false })
  hasUploadedDocument!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => SupplierInvoiceLineItemEntity, (line) => line.invoice)
  lineItems?: SupplierInvoiceLineItemEntity[];
}
