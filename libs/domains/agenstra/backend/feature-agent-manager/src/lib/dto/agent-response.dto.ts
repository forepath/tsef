import { GitRepositorySetupMode } from '../constants/git-repository-setup-mode';
import { ContainerType } from '../entities/agent.entity';

import type { AgentTypeCapabilities } from './config-response.dto';

/**
 * DTO for agent API responses.
 * Excludes sensitive information like password hash.
 */
export class AgentResponseDto {
  id!: string;
  name!: string;
  description?: string;
  agentType!: string;
  containerType!: ContainerType;
  /**
   * Capabilities of the agent's provider (mirrors config agentTypes capabilities).
   */
  capabilities?: AgentTypeCapabilities;
  vnc?: {
    port: number;
    password: string;
  };
  ssh?: {
    port: number;
    password: string;
  };
  git?: {
    repositoryUrl?: string;
    setupMode: GitRepositorySetupMode;
  };
  createdAt!: Date;
  updatedAt!: Date;
}
