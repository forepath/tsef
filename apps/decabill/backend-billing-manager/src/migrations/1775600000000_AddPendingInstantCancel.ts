import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPendingInstantCancel1775600000000 implements MigrationInterface {
  name = 'AddPendingInstantCancel1775600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "subscription_status_enum" RENAME TO "subscription_status_enum_old"`);
    await queryRunner.query(
      `CREATE TYPE "subscription_status_enum" AS ENUM ('active', 'pending_backorder', 'pending_cancel', 'pending_withdrawal', 'pending_instant_cancel', 'pending_config_change', 'canceled')`,
    );
    await queryRunner.query(`ALTER TABLE "billing_subscriptions" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "billing_subscriptions" ALTER COLUMN "status" TYPE "subscription_status_enum" USING "status"::text::"subscription_status_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "billing_subscriptions" ALTER COLUMN "status" SET DEFAULT 'active'`);
    await queryRunner.query(`DROP TYPE "subscription_status_enum_old"`);

    await queryRunner.addColumn(
      'billing_subscriptions',
      new TableColumn({
        name: 'instant_removal',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
    );

    await queryRunner.addColumn(
      'billing_subscriptions',
      new TableColumn({
        name: 'instant_canceled_at',
        type: 'timestamp',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('billing_subscriptions', 'instant_canceled_at');
    await queryRunner.dropColumn('billing_subscriptions', 'instant_removal');

    await queryRunner.query(
      `UPDATE "billing_subscriptions" SET "status" = 'canceled' WHERE "status" = 'pending_instant_cancel'`,
    );
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
  }
}
