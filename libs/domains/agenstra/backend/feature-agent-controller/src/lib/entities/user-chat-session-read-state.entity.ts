import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('user_chat_session_read_state')
@Index('IDX_user_chat_session_read_state_user_id', ['userId'])
@Index('uq_user_chat_session_read_state_user_client_agent_chat', ['userId', 'clientId', 'agentId', 'chatSessionId'], {
  unique: true,
})
export class UserChatSessionReadStateEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ type: 'varchar', length: 64, name: 'user_id' })
  userId!: string;

  @Column({ type: 'uuid', name: 'client_id' })
  clientId!: string;

  @Column({ type: 'uuid', name: 'agent_id' })
  agentId!: string;

  @Column({ type: 'uuid', name: 'chat_session_id' })
  chatSessionId!: string;

  @Column({ type: 'timestamptz', name: 'last_read_at', nullable: true })
  lastReadAt?: Date | null;

  @Column({ type: 'uuid', name: 'last_read_agent_message_id', nullable: true })
  lastReadAgentMessageId?: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
