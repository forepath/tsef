import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Adds encrypted custom_data column for admin-only customer profile key/value linkage data.
 */
export class AddCustomerProfileCustomData1775700000000 implements MigrationInterface {
  name = 'AddCustomerProfileCustomData1775700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'billing_customer_profiles',
      new TableColumn({
        name: 'custom_data',
        type: 'text',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('billing_customer_profiles', 'custom_data');
  }
}
