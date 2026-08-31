import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomTaxCategory1777200000000 implements MigrationInterface {
  name = 'AddCustomTaxCategory1777200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TYPE "tax_category_enum" ADD VALUE 'custom';
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL cannot remove enum values safely; leave 'custom' in place.
    void queryRunner;
  }
}
