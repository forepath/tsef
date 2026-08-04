import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Persist agent-issued ACP session ids so chat can resume after API restarts.
 */
export class AddAcpSessionColumnsToAgentsTable1781000000000 implements MigrationInterface {
  name = 'AddAcpSessionColumnsToAgentsTable1781000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'agents',
      new TableColumn({
        name: 'acp_session_id',
        type: 'varchar',
        length: '512',
        isNullable: true,
      }),
    );
    await queryRunner.addColumn(
      'agents',
      new TableColumn({
        name: 'acp_session_container_id',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('agents', 'acp_session_container_id');
    await queryRunner.dropColumn('agents', 'acp_session_id');
  }
}
