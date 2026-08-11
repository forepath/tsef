import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Adds display_name to billing_subscription_items.
 * Optional customer-defined label for subscription services in dashboards and lists.
 */
export class AddDisplayNameToSubscriptionItems1776300000000 implements MigrationInterface {
  name = 'AddDisplayNameToSubscriptionItems1776300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'billing_subscription_items',
      new TableColumn({
        name: 'display_name',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('billing_subscription_items', 'display_name');
  }
}
