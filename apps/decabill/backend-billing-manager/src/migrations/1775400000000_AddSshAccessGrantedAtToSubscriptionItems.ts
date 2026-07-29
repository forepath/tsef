import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Adds ssh_access_granted_at to billing_subscription_items.
 * Marks that the customer has revealed the provisioning SSH private key at least once.
 */
export class AddSshAccessGrantedAtToSubscriptionItems1775400000000 implements MigrationInterface {
  name = 'AddSshAccessGrantedAtToSubscriptionItems1775400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'billing_subscription_items',
      new TableColumn({
        name: 'ssh_access_granted_at',
        type: 'timestamptz',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('billing_subscription_items', 'ssh_access_granted_at');
  }
}
