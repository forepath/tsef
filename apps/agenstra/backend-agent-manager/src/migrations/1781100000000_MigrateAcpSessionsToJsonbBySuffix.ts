import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Store ACP session ids per resumeSessionSuffix (primary + automation / helper sessions).
 */
export class MigrateAcpSessionsToJsonbBySuffix1781100000000 implements MigrationInterface {
  name = 'MigrateAcpSessionsToJsonbBySuffix1781100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'agents',
      new TableColumn({
        name: 'acp_sessions',
        type: 'jsonb',
        isNullable: true,
      }),
    );

    await queryRunner.query(`
      UPDATE "agents"
      SET "acp_sessions" = jsonb_build_object('', "acp_session_id")
      WHERE "acp_session_id" IS NOT NULL
    `);

    await queryRunner.dropColumn('agents', 'acp_session_id');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'agents',
      new TableColumn({
        name: 'acp_session_id',
        type: 'varchar',
        length: '512',
        isNullable: true,
      }),
    );

    await queryRunner.query(`
      UPDATE "agents"
      SET "acp_session_id" = "acp_sessions"->>''
      WHERE "acp_sessions" IS NOT NULL
        AND ("acp_sessions"->>'') IS NOT NULL
    `);

    await queryRunner.dropColumn('agents', 'acp_sessions');
  }
}
