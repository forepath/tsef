import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAddonTables1775000000000 implements MigrationInterface {
  name = 'CreateAddonTables1775000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "billing_addons" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" character varying(64) NOT NULL DEFAULT 'default',
        "key" character varying(100) NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" text,
        "implementation_type" character varying(32) NOT NULL,
        "module_key" character varying(255),
        "script_template" text,
        "config_schema" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "config_default_values" text,
        "compatible_providers" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "base_price" numeric(12,4),
        "price_interval_type" character varying(16),
        "price_interval_value" integer,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_billing_addons" PRIMARY KEY ("id"),
        CONSTRAINT "uq_billing_addons_tenant_key" UNIQUE ("tenant_id", "key")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_billing_addons_tenant_active"
      ON "billing_addons" ("tenant_id", "is_active")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "billing_subscription_addons" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "subscription_id" uuid NOT NULL,
        "addon_id" uuid NOT NULL,
        "status" character varying(32) NOT NULL DEFAULT 'pending',
        "config_snapshot" text,
        "unit_price_snapshot" numeric(12,4),
        "price_interval_type" character varying(16),
        "price_interval_value" integer,
        "addon_name_snapshot" character varying(255) NOT NULL,
        "activated_at" TIMESTAMPTZ,
        "deactivated_at" TIMESTAMPTZ,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_billing_subscription_addons" PRIMARY KEY ("id"),
        CONSTRAINT "FK_billing_subscription_addons_subscription"
          FOREIGN KEY ("subscription_id") REFERENCES "billing_subscriptions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_billing_subscription_addons_addon"
          FOREIGN KEY ("addon_id") REFERENCES "billing_addons"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_billing_subscription_addons_subscription"
      ON "billing_subscription_addons" ("subscription_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_billing_subscription_addons_status"
      ON "billing_subscription_addons" ("subscription_id", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_billing_subscription_addons_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_billing_subscription_addons_subscription"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "billing_subscription_addons"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_billing_addons_tenant_active"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "billing_addons"`);
  }
}
