/**
 * DTO for agent API responses.
 * Excludes sensitive information like password hash.
 */
export class AgentResponseDto {
  id!: string;
  name!: string;
  description?: string;
  agentType!: string;
  vnc?: {
    port: number;
    password: string;
  };
  git?: {
    repositoryUrl: string;
  };
  createdAt!: Date;
  updatedAt!: Date;
}
