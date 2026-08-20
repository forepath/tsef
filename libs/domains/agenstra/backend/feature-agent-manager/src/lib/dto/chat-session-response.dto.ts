import type { AgentChatSessionKind } from '../constants/chat-session.constants';

/**
 * DTO for chat session API responses and embedded agent profile summaries.
 */
export class ChatSessionResponseDto {
  id!: string;
  agentId!: string;
  title?: string;
  kind!: AgentChatSessionKind;
  lastMessageAt?: Date;
  createdAt!: Date;
  updatedAt!: Date;
}

/**
 * Compact chat summary embedded on AgentResponseDto.
 */
export class AgentChatSessionSummaryDto {
  id!: string;
  title?: string;
  kind!: AgentChatSessionKind;
  lastMessageAt?: Date;
  createdAt!: Date;
}
