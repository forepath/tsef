import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { UserChatSessionReadStateEntity } from '../entities/user-chat-session-read-state.entity';

@Injectable()
export class UserChatSessionReadStateRepository {
  constructor(
    @InjectRepository(UserChatSessionReadStateEntity)
    private readonly repository: Repository<UserChatSessionReadStateEntity>,
  ) {}

  async findOne(
    userId: string,
    clientId: string,
    agentId: string,
    chatSessionId: string,
  ): Promise<UserChatSessionReadStateEntity | null> {
    return await this.repository.findOne({ where: { userId, clientId, agentId, chatSessionId } });
  }

  async upsertReadState(params: {
    userId: string;
    clientId: string;
    agentId: string;
    chatSessionId: string;
    lastReadAt: Date;
    lastReadAgentMessageId?: string | null;
  }): Promise<UserChatSessionReadStateEntity> {
    const existing = await this.findOne(params.userId, params.clientId, params.agentId, params.chatSessionId);

    if (existing) {
      existing.lastReadAt = params.lastReadAt;
      existing.lastReadAgentMessageId = params.lastReadAgentMessageId ?? null;

      return await this.repository.save(existing);
    }

    const created = this.repository.create({
      userId: params.userId,
      clientId: params.clientId,
      agentId: params.agentId,
      chatSessionId: params.chatSessionId,
      lastReadAt: params.lastReadAt,
      lastReadAgentMessageId: params.lastReadAgentMessageId ?? null,
    });

    return await this.repository.save(created);
  }

  async findByUserAndClientIds(userId: string, clientIds: string[]): Promise<UserChatSessionReadStateEntity[]> {
    if (clientIds.length === 0) {
      return [];
    }

    return await this.repository.find({
      where: { userId, clientId: In(clientIds) },
    });
  }

  async findByUserClientAgent(
    userId: string,
    clientId: string,
    agentId: string,
  ): Promise<UserChatSessionReadStateEntity[]> {
    return await this.repository.find({ where: { userId, clientId, agentId } });
  }
}
