import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddServiceTabsToCloudInitConfigs1776700000000 implements MigrationInterface {
  name = 'AddServiceTabsToCloudInitConfigs1776700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "billing_cloud_init_configs"
      ADD COLUMN IF NOT EXISTS "service_tabs" jsonb NOT NULL DEFAULT '[]'::jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "billing_cloud_init_configs"
      DROP COLUMN IF EXISTS "service_tabs"
    `);
  }
}
