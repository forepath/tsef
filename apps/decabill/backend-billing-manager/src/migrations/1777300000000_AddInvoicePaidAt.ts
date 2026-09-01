import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddInvoicePaidAt1777300000000 implements MigrationInterface {
  name = 'AddInvoicePaidAt1777300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('billing_invoices', 'paid_at'))) {
      await queryRunner.addColumn(
        'billing_invoices',
        new TableColumn({
          name: 'paid_at',
          type: 'timestamp',
          isNullable: true,
        }),
      );
    }

    if (!(await queryRunner.hasColumn('billing_supplier_invoices', 'paid_at'))) {
      await queryRunner.addColumn(
        'billing_supplier_invoices',
        new TableColumn({
          name: 'paid_at',
          type: 'timestamp',
          isNullable: true,
        }),
      );
    }

    // Best-effort backfill for already-paid invoices using known lifecycle timestamps.
    await queryRunner.query(`
      UPDATE billing_invoices
      SET paid_at = COALESCE(issued_at, created_at)
      WHERE status = 'paid' AND paid_at IS NULL
    `);

    await queryRunner.query(`
      UPDATE billing_supplier_invoices
      SET paid_at = COALESCE(issued_at, created_at)
      WHERE status = 'paid' AND paid_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('billing_supplier_invoices', 'paid_at')) {
      await queryRunner.dropColumn('billing_supplier_invoices', 'paid_at');
    }

    if (await queryRunner.hasColumn('billing_invoices', 'paid_at')) {
      await queryRunner.dropColumn('billing_invoices', 'paid_at');
    }
  }
}
