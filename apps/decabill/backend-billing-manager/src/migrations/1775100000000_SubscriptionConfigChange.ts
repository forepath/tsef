import { MigrationInterface, QueryRunner } from 'typeorm';

export class SubscriptionConfigChange1775100000000 implements MigrationInterface {
  name = 'SubscriptionConfigChange1775100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "billing_addons"
      ADD COLUMN IF NOT EXISTS "deprovision_script_template" text
    `);

    await queryRunner.query(`ALTER TYPE "subscription_status_enum" RENAME TO "subscription_status_enum_old"`);
    await queryRunner.query(
      `CREATE TYPE "subscription_status_enum" AS ENUM ('active', 'pending_backorder', 'pending_cancel', 'pending_withdrawal', 'pending_config_change', 'canceled')`,
    );
    await queryRunner.query(`ALTER TABLE "billing_subscriptions" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "billing_subscriptions" ALTER COLUMN "status" TYPE "subscription_status_enum" USING "status"::text::"subscription_status_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "billing_subscriptions" ALTER COLUMN "status" SET DEFAULT 'active'`);
    await queryRunner.query(`DROP TYPE "subscription_status_enum_old"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "billing_subscription_config_changes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "subscription_id" uuid NOT NULL,
        "status" character varying(32) NOT NULL DEFAULT 'pending',
        "requested_payload" text,
        "billing_disclaimer_snapshot" jsonb,
        "applied_steps" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "billing_outcome" character varying(32),
        "reclaim_count" integer NOT NULL DEFAULT 0,
        "error_code" character varying(64),
        "error_message" character varying(500),
        "requested_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "processed_at" TIMESTAMPTZ,
        "processing_started_at" TIMESTAMPTZ,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_billing_subscription_config_changes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_billing_subscription_config_changes_subscription"
          FOREIGN KEY ("subscription_id") REFERENCES "billing_subscriptions"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_billing_subscription_config_changes_subscription"
      ON "billing_subscription_config_changes" ("subscription_id", "created_at")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_billing_subscription_config_changes_status"
      ON "billing_subscription_config_changes" ("status", "requested_at")
    `);

    await queryRunner.query(`
      ALTER TABLE "billing_open_positions"
      ADD COLUMN IF NOT EXISTS "adjustment_net" numeric(12,4),
      ADD COLUMN IF NOT EXISTS "adjustment_kind" character varying(64)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "billing_open_positions" DROP COLUMN IF EXISTS "adjustment_kind"`);
    await queryRunner.query(`ALTER TABLE "billing_open_positions" DROP COLUMN IF EXISTS "adjustment_net"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_billing_subscription_config_changes_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_billing_subscription_config_changes_subscription"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "billing_subscription_config_changes"`);

    await queryRunner.query(
      `UPDATE "billing_subscriptions" SET "status" = 'active' WHERE "status" = 'pending_config_change'`,
    );
    await queryRunner.query(`ALTER TYPE "subscription_status_enum" RENAME TO "subscription_status_enum_old"`);
    await queryRunner.query(
      `CREATE TYPE "subscription_status_enum" AS ENUM ('active', 'pending_backorder', 'pending_cancel', 'pending_withdrawal', 'canceled')`,
    );
    await queryRunner.query(`ALTER TABLE "billing_subscriptions" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "billing_subscriptions" ALTER COLUMN "status" TYPE "subscription_status_enum" USING "status"::text::"subscription_status_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "billing_subscriptions" ALTER COLUMN "status" SET DEFAULT 'active'`);
    await queryRunner.query(`DROP TYPE "subscription_status_enum_old"`);

    await queryRunner.query(`ALTER TABLE "billing_addons" DROP COLUMN IF EXISTS "deprovision_script_template"`);
  }
}
