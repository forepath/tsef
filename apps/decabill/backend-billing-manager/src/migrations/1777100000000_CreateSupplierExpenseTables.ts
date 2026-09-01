import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateSupplierExpenseTables1777100000000 implements MigrationInterface {
  name = 'CreateSupplierExpenseTables1777100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'billing_supplier_number_sequences',
        columns: [
          { name: 'scope_key', type: 'varchar', length: '64', isPrimary: true },
          { name: 'last_value', type: 'int', default: 0 },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'billing_supplier_invoice_number_sequences',
        columns: [
          { name: 'tenant_id', type: 'varchar', length: '64', isPrimary: true, default: "'default'" },
          { name: 'year', type: 'int', isPrimary: true },
          { name: 'last_value', type: 'int', default: 0 },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'billing_supplier_profiles',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'tenant_id', type: 'varchar', length: '64', default: "'default'" },
          { name: 'supplier_number', type: 'varchar', length: '50' },
          { name: 'number_scope', type: 'varchar', length: '64', default: "'__shared__'" },
          { name: 'first_name', type: 'varchar', length: '255', isNullable: true },
          { name: 'last_name', type: 'varchar', length: '255', isNullable: true },
          { name: 'company', type: 'varchar', length: '255', isNullable: true },
          { name: 'customer_type', type: 'varchar', length: '16', isNullable: true },
          { name: 'vat_id', type: 'varchar', length: '32', isNullable: true },
          { name: 'vat_id_validation_status', type: 'varchar', length: '16', default: "'none'" },
          { name: 'vat_id_validated_at', type: 'timestamp', isNullable: true },
          { name: 'vat_id_validation_source', type: 'varchar', length: '16', isNullable: true },
          { name: 'address_line_1', type: 'varchar', length: '255', isNullable: true },
          { name: 'address_line_2', type: 'varchar', length: '255', isNullable: true },
          { name: 'postal_code', type: 'varchar', length: '30', isNullable: true },
          { name: 'city', type: 'varchar', length: '255', isNullable: true },
          { name: 'state', type: 'varchar', length: '255', isNullable: true },
          { name: 'country', type: 'varchar', length: '2', isNullable: true },
          { name: 'email', type: 'varchar', length: '255', isNullable: true },
          { name: 'phone', type: 'varchar', length: '50', isNullable: true },
          { name: 'custom_data', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'billing_supplier_profiles',
      new TableIndex({
        name: 'uq_billing_supplier_profiles_number_scope_number',
        columnNames: ['number_scope', 'supplier_number'],
        isUnique: true,
      }),
    );
    await queryRunner.createIndex(
      'billing_supplier_profiles',
      new TableIndex({
        name: 'idx_billing_supplier_profiles_tenant_id',
        columnNames: ['tenant_id'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'billing_supplier_contracts',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'supplier_id', type: 'uuid' },
          { name: 'contract_number', type: 'varchar', length: '128' },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'billing_supplier_contracts',
      new TableIndex({
        name: 'uq_billing_supplier_contracts_supplier_number',
        columnNames: ['supplier_id', 'contract_number'],
        isUnique: true,
      }),
    );
    await queryRunner.createForeignKey(
      'billing_supplier_contracts',
      new TableForeignKey({
        columnNames: ['supplier_id'],
        referencedTableName: 'billing_supplier_profiles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'billing_supplier_invoices',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'supplier_id', type: 'uuid' },
          { name: 'contract_id', type: 'uuid', isNullable: true },
          { name: 'invoice_number', type: 'varchar', length: '64', isNullable: true },
          { name: 'status', type: 'enum', enumName: 'invoice_status_enum', default: "'draft'" },
          { name: 'currency', type: 'varchar', length: '10', default: "'EUR'" },
          { name: 'subtotal_net', type: 'decimal', precision: 12, scale: 4, default: 0 },
          { name: 'tax_total', type: 'decimal', precision: 12, scale: 4, default: 0 },
          { name: 'total_gross', type: 'decimal', precision: 12, scale: 4, default: 0 },
          { name: 'balance_due', type: 'decimal', precision: 12, scale: 4, default: 0 },
          { name: 'tax_mode', type: 'varchar', length: '64', isNullable: true },
          { name: 'tax_country_code', type: 'varchar', length: '2', isNullable: true },
          { name: 'tax_note', type: 'text', isNullable: true },
          { name: 'einvoice_tax_category_code', type: 'varchar', length: '8', isNullable: true },
          { name: 'resolved_tax_rate', type: 'decimal', precision: 8, scale: 4, isNullable: true },
          { name: 'supplier_vat_id', type: 'varchar', length: '32', isNullable: true },
          { name: 'supplier_country', type: 'varchar', length: '2', isNullable: true },
          { name: 'supplier_customer_type', type: 'varchar', length: '16', isNullable: true },
          { name: 'recipient_country', type: 'varchar', length: '2', isNullable: true },
          { name: 'recipient_is_in_eu', type: 'boolean', isNullable: true },
          { name: 'issue_date', type: 'date', isNullable: true },
          { name: 'due_date', type: 'date', isNullable: true },
          { name: 'issued_at', type: 'timestamp', isNullable: true },
          { name: 'voided_at', type: 'timestamp', isNullable: true },
          { name: 'document_storage_key', type: 'varchar', length: '512', isNullable: true },
          { name: 'document_source', type: 'varchar', length: '16', isNullable: true },
          { name: 'has_uploaded_document', type: 'boolean', default: false },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKey(
      'billing_supplier_invoices',
      new TableForeignKey({
        columnNames: ['supplier_id'],
        referencedTableName: 'billing_supplier_profiles',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );
    await queryRunner.createForeignKey(
      'billing_supplier_invoices',
      new TableForeignKey({
        columnNames: ['contract_id'],
        referencedTableName: 'billing_supplier_contracts',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
    await queryRunner.createIndex(
      'billing_supplier_invoices',
      new TableIndex({
        name: 'idx_billing_supplier_invoices_supplier_id',
        columnNames: ['supplier_id'],
      }),
    );
    await queryRunner.createIndex(
      'billing_supplier_invoices',
      new TableIndex({
        name: 'idx_billing_supplier_invoices_issue_date',
        columnNames: ['issue_date'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'billing_supplier_invoice_line_items',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'invoice_id', type: 'uuid' },
          { name: 'position', type: 'int', default: 0 },
          { name: 'description', type: 'varchar', length: '500' },
          { name: 'quantity', type: 'decimal', precision: 12, scale: 4, default: 1 },
          { name: 'unit_price_net', type: 'decimal', precision: 12, scale: 4 },
          {
            name: 'tax_category',
            type: 'enum',
            enumName: 'tax_category_enum',
            default: "'standard'",
          },
          { name: 'tax_rate', type: 'decimal', precision: 8, scale: 4 },
          { name: 'line_net', type: 'decimal', precision: 12, scale: 4 },
          { name: 'line_tax', type: 'decimal', precision: 12, scale: 4 },
          { name: 'line_gross', type: 'decimal', precision: 12, scale: 4 },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKey(
      'billing_supplier_invoice_line_items',
      new TableForeignKey({
        columnNames: ['invoice_id'],
        referencedTableName: 'billing_supplier_invoices',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'billing_datev_creditor_accounts',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'tenant_id', type: 'varchar', length: '64' },
          { name: 'supplier_id', type: 'uuid' },
          { name: 'allocation_scope', type: 'varchar', length: '64', default: "'__shared__'" },
          { name: 'creditor_number', type: 'int' },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'billing_datev_creditor_accounts',
      new TableIndex({
        name: 'uq_billing_datev_creditor_accounts_tenant_supplier',
        columnNames: ['tenant_id', 'supplier_id'],
        isUnique: true,
      }),
    );
    await queryRunner.createIndex(
      'billing_datev_creditor_accounts',
      new TableIndex({
        name: 'uq_billing_datev_creditor_accounts_scope_creditor',
        columnNames: ['allocation_scope', 'creditor_number'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('billing_datev_creditor_accounts', true);
    await queryRunner.dropTable('billing_supplier_invoice_line_items', true);
    await queryRunner.dropTable('billing_supplier_invoices', true);
    await queryRunner.dropTable('billing_supplier_contracts', true);
    await queryRunner.dropTable('billing_supplier_profiles', true);
    await queryRunner.dropTable('billing_supplier_invoice_number_sequences', true);
    await queryRunner.dropTable('billing_supplier_number_sequences', true);
  }
}
