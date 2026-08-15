import { MigrationInterface, QueryRunner, Table, TableColumn, TableIndex, TableUnique } from 'typeorm';

/**
 * Unifies invoice / subscription / debtor number pools behind TENANTS_SHARED_NUMBERS.
 * Default product mode is shared (`__shared__` scope). Tenant-isolated mode uses tenant id as scope.
 */
export class UnifySharedNumberGeneration1776400000000 implements MigrationInterface {
  name = 'UnifySharedNumberGeneration1776400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- Invoice sequences: coalesce per-tenant rows into __shared__ ---
    await queryRunner.query(`
      INSERT INTO billing_invoice_number_sequences (tenant_id, year, last_value)
      SELECT '__shared__', year, MAX(last_value)
      FROM billing_invoice_number_sequences
      WHERE tenant_id <> '__shared__'
      GROUP BY year
      ON CONFLICT (tenant_id, year) DO UPDATE
      SET last_value = GREATEST(
        billing_invoice_number_sequences.last_value,
        EXCLUDED.last_value
      )
    `);
    await queryRunner.query(`
      DELETE FROM billing_invoice_number_sequences
      WHERE tenant_id <> '__shared__'
    `);

    // --- Subscription number sequences + number_scope ---
    await queryRunner.createTable(
      new Table({
        name: 'billing_subscription_number_sequences',
        columns: [
          { name: 'scope_key', type: 'varchar', length: '64', isPrimary: true },
          { name: 'last_value', type: 'int', default: 0 },
        ],
      }),
      true,
    );

    await queryRunner.query(`
      INSERT INTO billing_subscription_number_sequences (scope_key, last_value)
      SELECT
        '__shared__',
        COALESCE(
          (
            SELECT MAX(CAST(SUBSTRING(number FROM 5) AS INTEGER))
            FROM billing_subscriptions
            WHERE number ~ '^SUB-[0-9]{6}$'
          ),
          (
            SELECT last_value
            FROM billing_subscription_number_seq
          ),
          0
        )
    `);

    if (!(await queryRunner.hasColumn('billing_subscriptions', 'number_scope'))) {
      await queryRunner.addColumn(
        'billing_subscriptions',
        new TableColumn({
          name: 'number_scope',
          type: 'varchar',
          length: '64',
          isNullable: false,
          default: "'__shared__'",
        }),
      );
    }

    await queryRunner.query(`UPDATE billing_subscriptions SET number_scope = '__shared__' WHERE number_scope IS NULL`);

    await queryRunner.query(`
      ALTER TABLE billing_subscriptions
      ALTER COLUMN number DROP DEFAULT
    `);

    const subscriptionNumberUniques = await queryRunner.query(`
      SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'billing_subscriptions'
        AND c.contype = 'u'
        AND pg_get_constraintdef(c.oid) ILIKE '%(number)%'
        AND pg_get_constraintdef(c.oid) NOT ILIKE '%number_scope%'
    `);

    for (const row of subscriptionNumberUniques as Array<{ conname: string }>) {
      await queryRunner.query(`ALTER TABLE billing_subscriptions DROP CONSTRAINT IF EXISTS "${row.conname}"`);
    }

    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_billing_subscriptions_number"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_billing_subscriptions_number_scope_number"
      ON billing_subscriptions (number_scope, number)
    `);

    // --- Debtor allocation_scope ---
    const duplicateDebtors = await queryRunner.query(`
      SELECT debtor_number, COUNT(*)::int AS cnt
      FROM billing_datev_debtor_accounts
      GROUP BY debtor_number
      HAVING COUNT(*) > 1
      LIMIT 1
    `);

    if ((duplicateDebtors as unknown[]).length > 0) {
      throw new Error(
        'Cannot migrate to shared debtor numbers: duplicate debtor_number values exist across tenants. ' +
          'Resolve collisions before enabling shared number pools.',
      );
    }

    if (!(await queryRunner.hasColumn('billing_datev_debtor_accounts', 'allocation_scope'))) {
      await queryRunner.addColumn(
        'billing_datev_debtor_accounts',
        new TableColumn({
          name: 'allocation_scope',
          type: 'varchar',
          length: '64',
          isNullable: false,
          default: "'__shared__'",
        }),
      );
    }

    await queryRunner.query(`
      UPDATE billing_datev_debtor_accounts
      SET allocation_scope = '__shared__'
      WHERE allocation_scope IS NULL OR allocation_scope = ''
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS "uq_billing_datev_debtor_accounts_tenant_debtor"`);
    await queryRunner.query(`
      ALTER TABLE billing_datev_debtor_accounts
      DROP CONSTRAINT IF EXISTS "uq_billing_datev_debtor_accounts_tenant_debtor"
    `);

    await queryRunner.createIndex(
      'billing_datev_debtor_accounts',
      new TableIndex({
        name: 'uq_billing_datev_debtor_accounts_scope_debtor',
        columnNames: ['allocation_scope', 'debtor_number'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('billing_datev_debtor_accounts', 'uq_billing_datev_debtor_accounts_scope_debtor');

    await queryRunner.createIndex(
      'billing_datev_debtor_accounts',
      new TableIndex({
        name: 'uq_billing_datev_debtor_accounts_tenant_debtor',
        columnNames: ['tenant_id', 'debtor_number'],
        isUnique: true,
      }),
    );

    if (await queryRunner.hasColumn('billing_datev_debtor_accounts', 'allocation_scope')) {
      await queryRunner.dropColumn('billing_datev_debtor_accounts', 'allocation_scope');
    }

    await queryRunner.query(`DROP INDEX IF EXISTS "uq_billing_subscriptions_number_scope_number"`);

    await queryRunner.createUniqueConstraint(
      'billing_subscriptions',
      new TableUnique({
        name: 'UQ_billing_subscriptions_number',
        columnNames: ['number'],
      }),
    );

    await queryRunner.query(`
      ALTER TABLE billing_subscriptions
      ALTER COLUMN number SET DEFAULT concat('SUB-', lpad(nextval('billing_subscription_number_seq')::text, 6, '0'))
    `);

    if (await queryRunner.hasColumn('billing_subscriptions', 'number_scope')) {
      await queryRunner.dropColumn('billing_subscriptions', 'number_scope');
    }

    await queryRunner.dropTable('billing_subscription_number_sequences', true);

    await queryRunner.query(`
      INSERT INTO billing_invoice_number_sequences (tenant_id, year, last_value)
      SELECT 'default', year, last_value
      FROM billing_invoice_number_sequences
      WHERE tenant_id = '__shared__'
      ON CONFLICT (tenant_id, year) DO UPDATE
      SET last_value = EXCLUDED.last_value
    `);
    await queryRunner.query(`DELETE FROM billing_invoice_number_sequences WHERE tenant_id = '__shared__'`);
  }
}
