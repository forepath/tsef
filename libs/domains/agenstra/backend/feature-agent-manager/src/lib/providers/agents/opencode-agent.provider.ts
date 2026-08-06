import { Injectable } from '@nestjs/common';

import {
  AgentProvider,
  AgentProviderCapabilities,
  AgentProviderModels,
  AgentProviderOptions,
  AgentResponseObject,
} from '../agent-provider.interface';
import { AcpAgentMessagingService } from '../acp/acp-agent-messaging.service';
import { ACP_INITIALIZATION_INSTRUCTIONS, OPENCODE_ACP_LAUNCH_SPEC } from '../acp/acp-provider.config';

/**
 * OpenCode agent provider implementation.
 * Handles communication with the opencode agent binary running in Docker containers.
 */
@Injectable()
export class OpenCodeAgentProvider implements AgentProvider {
  private static readonly TYPE = 'opencode';
  private static readonly LIST_MODELS_COMMAND = 'opencode models';

  constructor(private readonly acpMessaging: AcpAgentMessagingService) {}

  /**
   * Get the unique type identifier for this provider.
   * @returns 'opencode'
   */
  getType(): string {
    return OpenCodeAgentProvider.TYPE;
  }

  /**
   * Get the human-readable display name for this provider.
   * @returns 'OpenCode'
   */
  getDisplayName(): string {
    return 'OpenCode';
  }

  getCapabilities(): AgentProviderCapabilities {
    return {
      transport: 'acp',
      supportsChat: true,
      supportsStreaming: true,
      supportsToolEvents: true,
      supportsQuestions: true,
    };
  }

  async *streamChatEvents(
    agentId: string,
    containerId: string,
    message: string,
    options?: AgentProviderOptions,
  ): AsyncIterable<AgentResponseObject> {
    yield* this.acpMessaging.streamChatEvents(
      { agentId, containerId, resumeSessionSuffix: options?.resumeSessionSuffix },
      OPENCODE_ACP_LAUNCH_SPEC,
      message,
      options,
    );
  }

  /**
   * Get the base path for the provider.
   * This is used to construct the API base URL.
   * @returns The base path string (e.g., '/app')
   */
  getBasePath(): string {
    return '/app';
  }

  /**
   * Get the base path for the provider's configuration.
   * This is used to construct the API base URL for the provider's configuration.
   * @returns The base path string (e.g., '~/.config/opencode')
   */
  getConfigBasePath(): string {
    return '~/.config/opencode';
  }

  /**
   * Get the Docker image (including tag) to use for opencode agent containers.
   * @returns The Docker image string
   */
  getDockerImage(): string {
    return process.env.OPENCODE_AGENT_DOCKER_IMAGE || 'ghcr.io/forepath/agenstra-manager-worker:latest';
  }

  /**
   * Get the Docker image (including tag) to use for virtual workspace containers created for this provider.
   * @returns The Docker image string
   */
  getVirtualWorkspaceDockerImage(): string {
    return process.env.OPENCODE_AGENT_VIRTUAL_WORKSPACE_DOCKER_IMAGE || 'ghcr.io/forepath/agenstra-manager-vnc:latest';
  }

  /**
   * Get the Docker image (including tag) to use for SSH connection containers created for this provider.
   * @returns The Docker image string
   */
  getSshConnectionDockerImage(): string {
    return process.env.OPENCODE_AGENT_SSH_CONNECTION_DOCKER_IMAGE || 'ghcr.io/forepath/agenstra-manager-ssh:latest';
  }

  /**
   * Get the command to list models.
   * @returns The command to list models
   */
  getModelsListCommand(): string {
    return OpenCodeAgentProvider.LIST_MODELS_COMMAND;
  }

  /**
   * Parse the result of the models list command.
   * Each non-empty line is a model id; id and display name are the same string.
   * @param result - The result of the models list command
   * @returns The list of models
   */
  toModelsList(result: string): AgentProviderModels {
    const models: AgentProviderModels = {};

    if (!result?.trim()) {
      return models;
    }

    for (const line of result.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (trimmed) {
        models[trimmed] = trimmed;
      }
    }

    return models;
  }

  async sendMessage(
    agentId: string,
    containerId: string,
    message: string,
    options?: AgentProviderOptions,
  ): Promise<string> {
    return this.acpMessaging.sendMessage(
      { agentId, containerId, resumeSessionSuffix: options?.resumeSessionSuffix },
      OPENCODE_ACP_LAUNCH_SPEC,
      message,
      options,
    );
  }

  async *sendMessageStream(
    agentId: string,
    containerId: string,
    message: string,
    options?: AgentProviderOptions,
  ): AsyncIterable<string> {
    yield* this.acpMessaging.sendMessageStream(
      { agentId, containerId, resumeSessionSuffix: options?.resumeSessionSuffix },
      OPENCODE_ACP_LAUNCH_SPEC,
      message,
      options,
    );
  }

  /**
   * Send an initialization message to the opencode-agent.
   * This establishes system context for the agent.
   * @param _agentId - The UUID of the agent (unused for opencode)
   * @param _containerId - The Docker container ID where the agent is running (unused for opencode)
   * @param _options - Optional configuration (e.g., model name) (unused for opencode)
   */
  async sendInitialization(agentId: string, containerId: string, options?: AgentProviderOptions): Promise<void> {
    await this.acpMessaging.sendInitialization(
      { agentId, containerId, resumeSessionSuffix: options?.resumeSessionSuffix },
      OPENCODE_ACP_LAUNCH_SPEC,
      ACP_INITIALIZATION_INSTRUCTIONS,
      options,
    );
  }

  /**
   * Convert the response from the agent to parseable strings.
   * Removes all characters that are not UTF-8 supported.
   * @param response - The response from the agent
   * @returns Array of parseable strings with only valid UTF-8 characters
   */
  toParseableStrings(response: string): string[] {
    return response
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  /**
   * Convert the response from the agent to a unified response object.
   * @param response - The response from the agent
   * @returns The unified response object
   */
  toUnifiedResponse(response: string): AgentResponseObject | undefined {
    return JSON.parse(response) as AgentResponseObject;
  }

  buildModelsCommand(): string {
    return `opencode models`;
  }
}
