import { Injectable, Logger } from '@nestjs/common';
import { DockerService } from '../../services/docker.service';
import { AgentProvider, AgentProviderOptions, AgentResponseObject } from '../agent-provider.interface';

/**
 * OpenCode agent provider implementation.
 * Handles communication with the opencode agent binary running in Docker containers.
 */
@Injectable()
export class OpenCodeAgentProvider implements AgentProvider {
  private readonly logger = new Logger(OpenCodeAgentProvider.name);
  private static readonly TYPE = 'opencode';

  constructor(private readonly dockerService: DockerService) {}

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
    // Build command: opencode agent with prompt mode and JSON output
    let command = `opencode run`;
    if (options?.continue === undefined || options?.continue === true) {
      command += ` --continue`;
    }
    if (options?.model && options.model !== 'auto') {
      command += ` --model ${options.model}`;
    }

    // Send the message to STDIN of the command and get the response
    const response = await this.dockerService.sendCommandToContainer(containerId, command, message);

    if (response.includes('Session not found')) {
      return this.sendMessage(agentId, containerId, message, {
        ...options,
        continue: false,
      });
    }

    return response;
  }

  /**
   * Send an initialization message to the cursor-agent.
   * This establishes system context for the agent.
   * @param agentId - The UUID of the agent
   * @param containerId - The Docker container ID where the agent is running
   * @param options - Optional configuration (e.g., model name)
   */
  async sendInitialization(_agentId: string, _containerId: string, _options?: AgentProviderOptions): Promise<void> {
    return;
  }

  /**
   * Convert the response from the agent to a parseable string.
   * Removes all characters that are not UTF-8 supported.
   * @param response - The response from the agent
   * @returns The parseable string with only valid UTF-8 characters
   */
  toParseableString(response: string): string {
    // Remove invalid UTF-8 replacement characters ()
    let cleaned = response.replace(/\uFFFD/g, '');

    // Remove non-printable control characters except common whitespace (space, tab, newline, carriage return)
    // Filter out control characters: 0x00-0x1F (except 0x09 tab, 0x0A newline, 0x0D carriage return) and 0x7F-0x9F
    cleaned = Array.from(cleaned)
      .filter((char) => {
        const code = char.charCodeAt(0);
        // Keep printable ASCII (0x20-0x7E), tab (0x09), newline (0x0A), carriage return (0x0D)
        if (code >= 0x20 && code <= 0x7e) return true;
        if (code === 0x09 || code === 0x0a || code === 0x0d) return true;
        // Keep valid Unicode characters above 0x9F
        if (code > 0x9f) {
          // Validate it's a valid UTF-8 character
          try {
            const encoded = new TextEncoder().encode(char);
            const decoded = new TextDecoder('utf-8', { fatal: true }).decode(encoded);
            return decoded === char;
          } catch {
            return false;
          }
        }
        // Remove all other control characters
        return false;
      })
      .join('');

    // Remove any remaining invalid Unicode surrogate pairs
    cleaned = cleaned.replace(/[\uD800-\uDFFF]/g, '');

    // Remove first line if it only contains "_" (possibly with whitespace)
    const lines = cleaned.split(/\r?\n/);
    if (lines.length > 0 && lines[0].trim() === '_') {
      lines.shift();
    }
    cleaned = lines.join('\n');

    return cleaned.trim();
  }

  /**
   * Convert the response from the agent to a unified response object.
   * @param response - The response from the agent
   * @returns The unified response object
   */
  toUnifiedResponse(chatMessage: string): AgentResponseObject {
    const trimmedMessage = chatMessage.trim();

    return {
      type: 'result',
      subtype: 'success',
      result: trimmedMessage,
    };
  }
}
