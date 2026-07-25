import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDailyPriceRecalculation1775300000000 implements MigrationInterface {
  name = 'AddDailyPriceRecalculation1775300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "billing_service_plans"
      ADD COLUMN "auto_recalculate_price_daily" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "billing_subscriptions"
      ADD COLUMN "statutory_withdrawal_restarted_at" TIMESTAMP NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "billing_subscriptions"
      DROP COLUMN "statutory_withdrawal_restarted_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "billing_service_plans"
      DROP COLUMN "auto_recalculate_price_daily"
    `);
  }
}
