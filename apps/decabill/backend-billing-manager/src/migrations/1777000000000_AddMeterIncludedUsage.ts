import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMeterIncludedUsage1777000000000 implements MigrationInterface {
  name = 'AddMeterIncludedUsage1777000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "billing_meters"
      ADD COLUMN IF NOT EXISTS "default_included_usage" numeric(18,6) NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "billing_service_plan_meters"
      ADD COLUMN IF NOT EXISTS "included_usage" numeric(18,6)
    `);

    await queryRunner.query(`
      ALTER TABLE "billing_addon_meters"
      ADD COLUMN IF NOT EXISTS "included_usage" numeric(18,6)
    `);

    await queryRunner.query(`
      ALTER TABLE "billing_service_type_meters"
      ADD COLUMN IF NOT EXISTS "included_usage" numeric(18,6)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "billing_service_type_meters"
      DROP COLUMN IF EXISTS "included_usage"
    `);

    await queryRunner.query(`
      ALTER TABLE "billing_addon_meters"
      DROP COLUMN IF EXISTS "included_usage"
    `);

    await queryRunner.query(`
      ALTER TABLE "billing_service_plan_meters"
      DROP COLUMN IF EXISTS "included_usage"
    `);

    await queryRunner.query(`
      ALTER TABLE "billing_meters"
      DROP COLUMN IF EXISTS "default_included_usage"
    `);
  }
}
