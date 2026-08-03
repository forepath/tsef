import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

/**
 * Allows service plans (and subscription items) without a service type so billing-only
 * plans can deploy nothing. Adds plan.tenant_id for tenant isolation when the type FK is null.
 */
export class NullableServiceTypeOnPlansAndItems1775800000000 implements MigrationInterface {
  name = 'NullableServiceTypeOnPlansAndItems1775800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('billing_service_plans', 'tenant_id'))) {
      await queryRunner.addColumn(
        'billing_service_plans',
        new TableColumn({
          name: 'tenant_id',
          type: 'varchar',
          length: '64',
          isNullable: false,
          default: "'default'",
        }),
      );
    }

    await queryRunner.query(`
      UPDATE billing_service_plans sp
      SET tenant_id = st.tenant_id
      FROM billing_service_types st
      WHERE st.id = sp.service_type_id
    `);

    await queryRunner.createIndex(
      'billing_service_plans',
      new TableIndex({
        name: 'IDX_billing_service_plans_tenant_id',
        columnNames: ['tenant_id'],
      }),
    );

    await this.dropForeignKeysOnColumn(queryRunner, 'billing_service_plans', 'service_type_id');
    await queryRunner.changeColumn(
      'billing_service_plans',
      'service_type_id',
      new TableColumn({
        name: 'service_type_id',
        type: 'uuid',
        isNullable: true,
      }),
    );
    await queryRunner.createForeignKey(
      'billing_service_plans',
      new TableForeignKey({
        name: 'FK_billing_service_plans_service_type_id',
        columnNames: ['service_type_id'],
        referencedTableName: 'billing_service_types',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await this.dropForeignKeysOnColumn(queryRunner, 'billing_subscription_items', 'service_type_id');
    await queryRunner.changeColumn(
      'billing_subscription_items',
      'service_type_id',
      new TableColumn({
        name: 'service_type_id',
        type: 'uuid',
        isNullable: true,
      }),
    );
    await queryRunner.createForeignKey(
      'billing_subscription_items',
      new TableForeignKey({
        name: 'FK_billing_subscription_items_service_type_id',
        columnNames: ['service_type_id'],
        referencedTableName: 'billing_service_types',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM billing_subscription_items WHERE service_type_id IS NULL
    `);
    await queryRunner.query(`
      DELETE FROM billing_service_plans WHERE service_type_id IS NULL
    `);

    await this.dropForeignKeysOnColumn(queryRunner, 'billing_subscription_items', 'service_type_id');
    await queryRunner.changeColumn(
      'billing_subscription_items',
      'service_type_id',
      new TableColumn({
        name: 'service_type_id',
        type: 'uuid',
        isNullable: false,
      }),
    );
    await queryRunner.createForeignKey(
      'billing_subscription_items',
      new TableForeignKey({
        name: 'FK_billing_subscription_items_service_type_id',
        columnNames: ['service_type_id'],
        referencedTableName: 'billing_service_types',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await this.dropForeignKeysOnColumn(queryRunner, 'billing_service_plans', 'service_type_id');
    await queryRunner.changeColumn(
      'billing_service_plans',
      'service_type_id',
      new TableColumn({
        name: 'service_type_id',
        type: 'uuid',
        isNullable: false,
      }),
    );
    await queryRunner.createForeignKey(
      'billing_service_plans',
      new TableForeignKey({
        name: 'FK_billing_service_plans_service_type_id',
        columnNames: ['service_type_id'],
        referencedTableName: 'billing_service_types',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.dropIndex('billing_service_plans', 'IDX_billing_service_plans_tenant_id');

    if (await queryRunner.hasColumn('billing_service_plans', 'tenant_id')) {
      await queryRunner.dropColumn('billing_service_plans', 'tenant_id');
    }
  }

  private async dropForeignKeysOnColumn(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string,
  ): Promise<void> {
    const table = await queryRunner.getTable(tableName);

    if (!table) {
      return;
    }

    for (const fk of table.foreignKeys) {
      if (fk.columnNames.includes(columnName)) {
        await queryRunner.dropForeignKey(tableName, fk);
      }
    }
  }
}
