import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContributorJobsAndContainerStats1776800000000 implements MigrationInterface {
  name = 'AddContributorJobsAndContainerStats1776800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "billing_contributor_job_runs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" character varying(64) NOT NULL DEFAULT 'default',
        "source" character varying(32) NOT NULL,
        "source_key" character varying(100) NOT NULL,
        "job_key" character varying(64) NOT NULL,
        "last_started_at" TIMESTAMP,
        "last_finished_at" TIMESTAMP,
        "last_error" character varying(128),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_billing_contributor_job_runs" PRIMARY KEY ("id"),
        CONSTRAINT "uq_billing_contributor_job_runs_identity"
          UNIQUE ("tenant_id", "source", "source_key", "job_key")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "billing_container_stats_samples" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" character varying(64) NOT NULL DEFAULT 'default',
        "subscription_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "container_id" character varying(64) NOT NULL,
        "collected_at" TIMESTAMP NOT NULL,
        "stats" jsonb NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_billing_container_stats_samples" PRIMARY KEY ("id"),
        CONSTRAINT "FK_billing_container_stats_samples_item"
          FOREIGN KEY ("item_id") REFERENCES "billing_subscription_items"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_billing_container_stats_samples_item_container_collected"
      ON "billing_container_stats_samples" ("item_id", "container_id", "collected_at" DESC)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "billing_container_stats_summaries" (
        "item_id" uuid NOT NULL,
        "tenant_id" character varying(64) NOT NULL DEFAULT 'default',
        "subscription_id" uuid NOT NULL,
        "container_count" integer NOT NULL DEFAULT 0,
        "healthy_count" integer NOT NULL DEFAULT 0,
        "last_collected_at" TIMESTAMP NOT NULL,
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_billing_container_stats_summaries" PRIMARY KEY ("item_id"),
        CONSTRAINT "FK_billing_container_stats_summaries_item"
          FOREIGN KEY ("item_id") REFERENCES "billing_subscription_items"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "billing_container_stats_summaries"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "billing_container_stats_samples"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "billing_contributor_job_runs"`);
  }
}
