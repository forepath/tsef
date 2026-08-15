import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Adds scoped customer numbers (CUS-######) behind TENANTS_SHARED_NUMBERS.
 * Backfills existing profiles under __shared__ in created_at order.
 */
export class AddCustomerNumbers1776500000000 implements MigrationInterface {
  name = 'AddCustomerNumbers1776500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'billing_customer_number_sequences',
        columns: [
          { name: 'scope_key', type: 'varchar', length: '64', isPrimary: true },
          { name: 'last_value', type: 'int', default: 0 },
        ],
      }),
      true,
    );

    await queryRunner.query(`
      ALTER TABLE billing_customer_profiles
      ADD COLUMN IF NOT EXISTS customer_number varchar(50) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE billing_customer_profiles
      ADD COLUMN IF NOT EXISTS number_scope varchar(64) NULL
    `);

    await queryRunner.query(`
      WITH ordered AS (
        SELECT
          id,
          ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
        FROM billing_customer_profiles
        WHERE customer_number IS NULL
      )
      UPDATE billing_customer_profiles AS p
      SET
        number_scope = '__shared__',
        customer_number = 'CUS-' || lpad(ordered.rn::text, 6, '0')
      FROM ordered
      WHERE p.id = ordered.id
    `);

    await queryRunner.query(`
      INSERT INTO billing_customer_number_sequences (scope_key, last_value)
      SELECT
        '__shared__',
        COALESCE(
          (
            SELECT MAX(CAST(SUBSTRING(customer_number FROM 5) AS INTEGER))
            FROM billing_customer_profiles
            WHERE customer_number ~ '^CUS-[0-9]{6}$'
          ),
          0
        )
      ON CONFLICT (scope_key) DO UPDATE
      SET last_value = GREATEST(
        billing_customer_number_sequences.last_value,
        EXCLUDED.last_value
      )
    `);

    await queryRunner.query(`
      UPDATE billing_customer_profiles
      SET number_scope = '__shared__'
      WHERE number_scope IS NULL OR number_scope = ''
    `);

    await queryRunner.query(`
      ALTER TABLE billing_customer_profiles
      ALTER COLUMN customer_number SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE billing_customer_profiles
      ALTER COLUMN number_scope SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE billing_customer_profiles
      ALTER COLUMN number_scope SET DEFAULT '__shared__'
    `);

    await queryRunner.createIndex(
      'billing_customer_profiles',
      new TableIndex({
        name: 'uq_billing_customer_profiles_number_scope_number',
        columnNames: ['number_scope', 'customer_number'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('billing_customer_profiles', 'uq_billing_customer_profiles_number_scope_number');

    await queryRunner.query(`
      ALTER TABLE billing_customer_profiles
      DROP COLUMN IF EXISTS customer_number
    `);
    await queryRunner.query(`
      ALTER TABLE billing_customer_profiles
      DROP COLUMN IF EXISTS number_scope
    `);

    await queryRunner.dropTable('billing_customer_number_sequences', true);
  }
}
