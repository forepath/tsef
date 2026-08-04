import { GitRepositorySetupMode } from '../constants/git-repository-setup-mode';

/**
 * Capabilities advertised for an agent provider type.
 */
export class AgentTypeCapabilities {
  /**
   * Wire transport used for agent messaging (`acp` = Agent Client Protocol over stdio).
   */
  transport?: 'acp';

  supportsChat!: boolean;
  supportsStreaming!: boolean;
  supportsToolEvents!: boolean;
  supportsQuestions!: boolean;
}

/**
 * Agent type information with identifier, display name, and capabilities.
 */
export class AgentTypeInfo {
  /**
   * The unique type identifier (e.g., 'cursor', 'opencode')
   */
  type!: string;

  /**
   * Human-readable display name (e.g., 'Cursor', 'OpenCode')
   */
  displayName!: string;

  /**
   * Feature flags for the provider (chat, streaming, ACP transport, etc.).
   */
  capabilities!: AgentTypeCapabilities;
}

/**
 * DTO for configuration API responses.
 * Contains configuration parameters exposed to clients.
 */
export class ConfigResponseDto {
  gitRepositoryUrl?: string;
  gitRepositorySetupMode?: GitRepositorySetupMode;
  agentTypes!: AgentTypeInfo[];
}
