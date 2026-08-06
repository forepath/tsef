import { Injectable, Logger } from '@nestjs/common';

import {
  AgentProvider,
  AgentProviderCapabilities,
  AgentProviderModels,
  AgentProviderOptions,
  AgentResponseObject,
} from '../agent-provider.interface';
import { AcpAgentMessagingService } from '../acp/acp-agent-messaging.service';
import { ACP_INITIALIZATION_INSTRUCTIONS, CURSOR_ACP_LAUNCH_SPEC } from '../acp/acp-provider.config';

/**
 * Cursor-agent provider implementation.
 * Handles communication with the cursor-agent binary running in Docker containers.
 */
@Injectable()
export class CursorAgentProvider implements AgentProvider {
  private readonly logger = new Logger(CursorAgentProvider.name);
  private static readonly TYPE = 'cursor';
  private static readonly LIST_MODELS_COMMAND = 'cursor-agent --list-models';

  constructor(private readonly acpMessaging: AcpAgentMessagingService) {}

  /**
   * Get the unique type identifier for this provider.
   * @returns 'cursor'
   */
  getType(): string {
    return CursorAgentProvider.TYPE;
  }

  /**
   * Get the human-readable display name for this provider.
   * @returns 'Cursor'
   */
  getDisplayName(): string {
    return 'Cursor';
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
   * @returns The base path string (e.g., '~/.cursor')
   */
  getConfigBasePath(): string {
    return '~/.cursor';
  }

  /**
   * Get the Docker image (including tag) to use for cursor-agent containers.
   * @returns The Docker image string
   */
  getDockerImage(): string {
    return process.env.CURSOR_AGENT_DOCKER_IMAGE || 'ghcr.io/forepath/agenstra-manager-worker:latest';
  }

  /**
   * Get the Docker image (including tag) to use for virtual workspace containers created for this provider.
   * @returns The Docker image string
   */
  getVirtualWorkspaceDockerImage(): string {
    return process.env.CURSOR_AGENT_VIRTUAL_WORKSPACE_DOCKER_IMAGE || 'ghcr.io/forepath/agenstra-manager-vnc:latest';
  }

  /**
   * Get the Docker image (including tag) to use for SSH connection containers created for this provider.
   * @returns The Docker image string
   */
  getSshConnectionDockerImage(): string {
    return process.env.CURSOR_AGENT_SSH_CONNECTION_DOCKER_IMAGE || 'ghcr.io/forepath/agenstra-manager-ssh:latest';
  }

  /**
   * Get the command to list models.
   * @returns The command to list models
   */
  getModelsListCommand(): string {
    return CursorAgentProvider.LIST_MODELS_COMMAND;
  }

  private static readonly MODEL_LINE_SEPARATOR = ' - ';

  /** ANSI CSI sequences; ESC from char code to satisfy eslint no-control-regex. */
  private static readonly ANSI_CSI_ESCAPE = new RegExp(`${String.fromCharCode(0x1b)}\\[[0-9;]*[A-Za-z]`, 'g');

  /**
   * Strip ANSI CSI escape sequences (e.g. cursor movement / clear line) from CLI output.
   */
  private static stripAnsiSequences(text: string): string {
    return text.replace(CursorAgentProvider.ANSI_CSI_ESCAPE, '');
  }

  /**
   * Parse the result of the models list command.
   * @param result - The result of the models list command
   * @returns The list of models
   */
  toModelsList(result: string): AgentProviderModels {
    const models: AgentProviderModels = {};

    if (!result?.trim()) {
      return models;
    }

    const cleaned = CursorAgentProvider.stripAnsiSequences(result);
    const sep = CursorAgentProvider.MODEL_LINE_SEPARATOR;

    for (const line of cleaned.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed) {
        continue;
      }

      const sepIndex = trimmed.indexOf(sep);

      if (sepIndex === -1) {
        continue;
      }

      const id = trimmed.slice(0, sepIndex).trim();
      const name = trimmed.slice(sepIndex + sep.length).trim();

      if (id) {
        models[id] = name;
      }
    }

    return models;
  }

  /**
   * Send a message to the cursor-agent and get a response.
   * @param agentId - The UUID of the agent
   * @param containerId - The Docker container ID where the agent is running
   * @param message - The message to send to the agent
   * @param options - Optional configuration (e.g., model name)
   * @returns The agent's response as a string
   */
  async sendMessage(
    agentId: string,
    containerId: string,
    message: string,
    options?: AgentProviderOptions,
  ): Promise<string> {
    return this.acpMessaging.sendMessage(
      { agentId, containerId, resumeSessionSuffix: options?.resumeSessionSuffix },
      CURSOR_ACP_LAUNCH_SPEC,
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
      CURSOR_ACP_LAUNCH_SPEC,
      message,
      options,
    );
  }

  async *streamChatEvents(
    agentId: string,
    containerId: string,
    message: string,
    options?: AgentProviderOptions,
  ): AsyncIterable<AgentResponseObject> {
    yield* this.acpMessaging.streamChatEvents(
      { agentId, containerId, resumeSessionSuffix: options?.resumeSessionSuffix },
      CURSOR_ACP_LAUNCH_SPEC,
      message,
      options,
    );
  }

  /**
   * Send an initialization message to the cursor-agent.
   * This establishes system context for the agent.
   * @param agentId - The UUID of the agent
   * @param containerId - The Docker container ID where the agent is running
   * @param options - Optional configuration (e.g., model name)
   */
  async sendInitialization(agentId: string, containerId: string, options?: AgentProviderOptions): Promise<void> {
    try {
      await this.acpMessaging.sendInitialization(
        { agentId, containerId, resumeSessionSuffix: options?.resumeSessionSuffix },
        CURSOR_ACP_LAUNCH_SPEC,
        ACP_INITIALIZATION_INSTRUCTIONS,
        options,
      );
      this.logger.debug(`Sent ACP initialization message to agent ${agentId}`);
    } catch (error: unknown) {
      const err = error as { message?: string; stack?: string };

      this.logger.warn(`Failed to send ACP initialization message to agent ${agentId}: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Convert the response from the agent to a parseable strings.
   * Removes all characters that are not UTF-8 supported.
   * @param response - The response from the agent
   * @returns The parseable strings
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
}
