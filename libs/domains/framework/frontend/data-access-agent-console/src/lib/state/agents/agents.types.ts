// Types based on OpenAPI spec
export interface AgentResponseDto {
  id: string;
  name: string;
  description?: string;
  agentType: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentDto {
  name: string;
  description?: string;
  agentType?: string;
}

export interface UpdateAgentDto {
  name?: string;
  description?: string;
}

export interface CreateAgentResponseDto extends AgentResponseDto {
  password: string;
}

export interface ListClientAgentsParams {
  limit?: number;
  offset?: number;
}
