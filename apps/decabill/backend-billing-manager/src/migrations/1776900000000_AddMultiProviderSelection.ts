import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMultiProviderSelection1776900000000 implements MigrationInterface {
  name = 'AddMultiProviderSelection1776900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "billing_service_types"
      ADD COLUMN "allowed_providers" jsonb NOT NULL DEFAULT '[]'::jsonb
    `);
    await queryRunner.query(`
      UPDATE "billing_service_types"
      SET "allowed_providers" = jsonb_build_array("provider")
      WHERE "provider" IS NOT NULL AND TRIM("provider") <> ''
        AND ("allowed_providers" IS NULL OR "allowed_providers" = '[]'::jsonb)
    `);
    await queryRunner.query(`
      ALTER TABLE "billing_service_types"
      ALTER COLUMN "provider" DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "billing_service_plans"
      ADD COLUMN "allow_customer_provider_selection" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "billing_service_plans"
      ADD COLUMN "allowed_providers" jsonb NOT NULL DEFAULT '[]'::jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "billing_service_plans" DROP COLUMN "allowed_providers"
    `);
    await queryRunner.query(`
      ALTER TABLE "billing_service_plans" DROP COLUMN "allow_customer_provider_selection"
    `);
    await queryRunner.query(`
      UPDATE "billing_service_types"
      SET "provider" = COALESCE(
        NULLIF(TRIM("provider"), ''),
        NULLIF(TRIM("allowed_providers"->>0), ''),
        'hetzner'
      )
      WHERE "provider" IS NULL OR TRIM("provider") = ''
    `);
    await queryRunner.query(`
      ALTER TABLE "billing_service_types"
      ALTER COLUMN "provider" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "billing_service_types" DROP COLUMN "allowed_providers"
    `);
  }
}
