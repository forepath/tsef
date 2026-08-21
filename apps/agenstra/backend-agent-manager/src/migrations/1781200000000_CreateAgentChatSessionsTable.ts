import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

/**
 * Creates agent_chat_sessions, backfills a primary session per agent,
 * and attaches chat_session_id to agent_messages and agent_message_events.
 */
export class CreateAgentChatSessionsTable1781200000000 implements MigrationInterface {
  name = 'CreateAgentChatSessionsTable1781200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'agent_chat_sessions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'agent_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'kind',
            type: 'varchar',
            length: '16',
            isNullable: false,
          },
          {
            name: 'resume_session_suffix',
            type: 'varchar',
            length: '128',
            isNullable: false,
            default: "''",
          },
          {
            name: 'last_message_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'agent_chat_sessions',
      new TableForeignKey({
        columnNames: ['agent_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'agents',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'agent_chat_sessions',
      new TableIndex({
        name: 'IDX_agent_chat_sessions_agent_id',
        columnNames: ['agent_id'],
      }),
    );

    await queryRunner.createIndex(
      'agent_chat_sessions',
      new TableIndex({
        name: 'UQ_agent_chat_sessions_agent_suffix',
        columnNames: ['agent_id', 'resume_session_suffix'],
        isUnique: true,
      }),
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_agent_chat_sessions_agent_primary"
      ON "agent_chat_sessions" ("agent_id")
      WHERE "kind" = 'primary'
    `);

    await queryRunner.query(`
      INSERT INTO "agent_chat_sessions" ("agent_id", "title", "kind", "resume_session_suffix", "created_at", "updated_at")
      SELECT "id", 'Chat', 'primary', '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM "agents"
    `);

    await queryRunner.query(`
      ALTER TABLE "agent_messages"
      ADD COLUMN "chat_session_id" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "agent_message_events"
      ADD COLUMN "chat_session_id" uuid
    `);

    await queryRunner.query(`
      UPDATE "agent_messages" AS m
      SET "chat_session_id" = s."id"
      FROM "agent_chat_sessions" AS s
      WHERE s."agent_id" = m."agent_id" AND s."kind" = 'primary'
    `);

    await queryRunner.query(`
      UPDATE "agent_message_events" AS e
      SET "chat_session_id" = s."id"
      FROM "agent_chat_sessions" AS s
      WHERE s."agent_id" = e."agent_id" AND s."kind" = 'primary'
    `);

    await queryRunner.query(`
      UPDATE "agent_chat_sessions" AS s
      SET "last_message_at" = sub."max_created"
      FROM (
        SELECT "chat_session_id", MAX("created_at") AS "max_created"
        FROM "agent_messages"
        WHERE "chat_session_id" IS NOT NULL
        GROUP BY "chat_session_id"
      ) AS sub
      WHERE s."id" = sub."chat_session_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "agent_messages"
      ALTER COLUMN "chat_session_id" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "agent_message_events"
      ALTER COLUMN "chat_session_id" SET NOT NULL
    `);

    await queryRunner.createForeignKey(
      'agent_messages',
      new TableForeignKey({
        name: 'FK_agent_messages_chat_session_id',
        columnNames: ['chat_session_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'agent_chat_sessions',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'agent_message_events',
      new TableForeignKey({
        name: 'FK_agent_message_events_chat_session_id',
        columnNames: ['chat_session_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'agent_chat_sessions',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'agent_messages',
      new TableIndex({
        name: 'IDX_agent_messages_agent_chat_created',
        columnNames: ['agent_id', 'chat_session_id', 'created_at'],
      }),
    );

    await queryRunner.createIndex(
      'agent_message_events',
      new TableIndex({
        name: 'IDX_agent_message_events_agent_chat_created',
        columnNames: ['agent_id', 'chat_session_id', 'created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('agent_message_events', 'IDX_agent_message_events_agent_chat_created');
    await queryRunner.dropIndex('agent_messages', 'IDX_agent_messages_agent_chat_created');

    const messagesTable = await queryRunner.getTable('agent_messages');
    const messagesFk = messagesTable?.foreignKeys.find((fk) => fk.columnNames.includes('chat_session_id'));

    if (messagesFk) {
      await queryRunner.dropForeignKey('agent_messages', messagesFk);
    }

    const eventsTable = await queryRunner.getTable('agent_message_events');
    const eventsFk = eventsTable?.foreignKeys.find((fk) => fk.columnNames.includes('chat_session_id'));

    if (eventsFk) {
      await queryRunner.dropForeignKey('agent_message_events', eventsFk);
    }

    await queryRunner.query(`ALTER TABLE "agent_message_events" DROP COLUMN "chat_session_id"`);
    await queryRunner.query(`ALTER TABLE "agent_messages" DROP COLUMN "chat_session_id"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_agent_chat_sessions_agent_primary"`);
    await queryRunner.dropIndex('agent_chat_sessions', 'UQ_agent_chat_sessions_agent_suffix');
    await queryRunner.dropIndex('agent_chat_sessions', 'IDX_agent_chat_sessions_agent_id');

    const sessionsTable = await queryRunner.getTable('agent_chat_sessions');
    const sessionsFk = sessionsTable?.foreignKeys.find((fk) => fk.columnNames.includes('agent_id'));

    if (sessionsFk) {
      await queryRunner.dropForeignKey('agent_chat_sessions', sessionsFk);
    }

    await queryRunner.dropTable('agent_chat_sessions');
  }
}
