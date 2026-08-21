import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import type { AgentChatSessionKind } from '../constants/chat-session.constants';

import { AgentEntity } from './agent.entity';

/**
 * User-visible chat session bound to an agent (environment).
 * Primary session uses empty resumeSessionSuffix; user sessions use `-chat-{id}`.
 */
@Entity('agent_chat_sessions')
@Index(['agentId', 'resumeSessionSuffix'], { unique: true })
export class AgentChatSessionEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ type: 'uuid', name: 'agent_id' })
  agentId!: string;

  @ManyToOne(() => AgentEntity, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent!: AgentEntity;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'title' })
  title?: string | null;

  @Column({ type: 'varchar', length: 16, name: 'kind' })
  kind!: AgentChatSessionKind;

  @Column({ type: 'varchar', length: 128, name: 'resume_session_suffix', default: '' })
  resumeSessionSuffix!: string;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_message_at' })
  lastMessageAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
