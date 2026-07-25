import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConfigChangeBillingIdempotency1775200000000 implements MigrationInterface {
  name = 'ConfigChangeBillingIdempotency1775200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "billing_open_positions"
      ADD COLUMN IF NOT EXISTS "source_ref" character varying(128)
    `);

    await queryRunner.query(`
      ALTER TABLE "billing_invoice_credit_documents"
      ADD COLUMN IF NOT EXISTS "source_ref" character varying(128)
    `);

    await queryRunner.query(`
      ALTER TABLE "billing_invoice_credit_documents"
      ADD COLUMN IF NOT EXISTS "settlement_complete" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_billing_open_positions_source_ref"
      ON "billing_open_positions" ("source_ref")
      WHERE "source_ref" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_billing_invoice_credit_documents_source_ref"
      ON "billing_invoice_credit_documents" ("source_ref")
      WHERE "source_ref" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_billing_invoice_credit_documents_source_ref"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_billing_open_positions_source_ref"`);
    await queryRunner.query(
      `ALTER TABLE "billing_invoice_credit_documents" DROP COLUMN IF EXISTS "settlement_complete"`,
    );
    await queryRunner.query(`ALTER TABLE "billing_invoice_credit_documents" DROP COLUMN IF EXISTS "source_ref"`);
    await queryRunner.query(`ALTER TABLE "billing_open_positions" DROP COLUMN IF EXISTS "source_ref"`);
  }
}
