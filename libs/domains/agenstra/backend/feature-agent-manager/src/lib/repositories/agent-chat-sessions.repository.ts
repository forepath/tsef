import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { AgentChatSessionEntity } from '../entities/agent-chat-session.entity';

/**
 * Repository for agent chat session database operations.
 */
@Injectable()
export class AgentChatSessionsRepository {
  constructor(
    @InjectRepository(AgentChatSessionEntity)
    private readonly repository: Repository<AgentChatSessionEntity>,
  ) {}

  async findByIdOrThrow(id: string): Promise<AgentChatSessionEntity> {
    const session = await this.repository.findOne({ where: { id } });

    if (!session) {
      throw new NotFoundException(`Chat session with ID ${id} not found`);
    }

    return session;
  }

  async findById(id: string): Promise<AgentChatSessionEntity | null> {
    return await this.repository.findOne({ where: { id } });
  }

  async findByAgentIdAndId(agentId: string, id: string): Promise<AgentChatSessionEntity | null> {
    return await this.repository.findOne({ where: { agentId, id } });
  }

  async findByAgentIdAndIdOrThrow(agentId: string, id: string): Promise<AgentChatSessionEntity> {
    const session = await this.findByAgentIdAndId(agentId, id);

    if (!session) {
      throw new NotFoundException(`Chat session with ID ${id} not found for agent ${agentId}`);
    }

    return session;
  }

  async findPrimaryByAgentId(agentId: string): Promise<AgentChatSessionEntity | null> {
    return await this.repository.findOne({ where: { agentId, kind: 'primary' } });
  }

  async findByAgentId(agentId: string, limit = 50, offset = 0): Promise<AgentChatSessionEntity[]> {
    return await this.repository.find({
      where: { agentId },
      take: limit,
      skip: offset,
      order: { lastMessageAt: 'DESC', createdAt: 'ASC' },
    });
  }

  async findAllByAgentId(agentId: string): Promise<AgentChatSessionEntity[]> {
    return await this.repository.find({
      where: { agentId },
      order: { lastMessageAt: 'DESC', createdAt: 'ASC' },
    });
  }

  async findAllByAgentIds(agentIds: string[]): Promise<AgentChatSessionEntity[]> {
    if (agentIds.length === 0) {
      return [];
    }

    return await this.repository.find({
      where: { agentId: In(agentIds) },
      order: { lastMessageAt: 'DESC', createdAt: 'ASC' },
    });
  }

  async countByAgentId(agentId: string): Promise<number> {
    return await this.repository.count({ where: { agentId } });
  }

  async create(dto: Partial<AgentChatSessionEntity>): Promise<AgentChatSessionEntity> {
    const session = this.repository.create(dto);

    return await this.repository.save(session);
  }

  async update(id: string, dto: Partial<AgentChatSessionEntity>): Promise<AgentChatSessionEntity> {
    const session = await this.findByIdOrThrow(id);

    Object.assign(session, dto);

    return await this.repository.save(session);
  }

  async delete(id: string): Promise<void> {
    const session = await this.findByIdOrThrow(id);

    await this.repository.remove(session);
  }

  async touchLastMessageAt(id: string, at: Date = new Date()): Promise<void> {
    await this.repository.update({ id }, { lastMessageAt: at });
  }
}
