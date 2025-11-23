/**
 * Agent provider interface for implementing different agent solutions.
 * This interface allows the system to support multiple agent implementations
 * (e.g., cursor-agent, OpenAI, Anthropic, etc.) through a unified API.
 */
export interface AgentProvider {
  /**
   * Get the unique type identifier for this provider.
   * This is used to identify which provider to use for a given agent.
   * @returns The agent type string (e.g., 'cursor', 'openai', 'anthropic')
   */
  getType(): string;

  /**
   * Get the human-readable display name for this provider.
   * This is used in UI components to show a friendly name to users.
   * @returns The display name string (e.g., 'Cursor', 'OpenAI', 'Anthropic Claude')
   */
  getDisplayName(): string;

  /**
   * Get the Docker image (including tag) to use for containers created for this provider.
   * @returns The Docker image string (e.g., 'ghcr.io/forepath/agenstra-manager-worker:latest')
   */
  getDockerImage(): string;

  /**
   * Send a message to the agent and get a response.
   * @param agentId - The UUID of the agent
   * @param containerId - The Docker container ID where the agent is running
   * @param message - The message to send to the agent
   * @param options - Optional configuration (e.g., model name)
   * @returns The agent's response as a string
   */
  sendMessage(agentId: string, containerId: string, message: string, options?: AgentProviderOptions): Promise<string>;

  /**
   * Send an initialization message to the agent.
   * This is typically sent once when the agent first starts to establish context.
   * @param agentId - The UUID of the agent
   * @param containerId - The Docker container ID where the agent is running
   * @param options - Optional configuration (e.g., model name)
   * @returns Promise that resolves when initialization is complete
   */
  sendInitialization(agentId: string, containerId: string, options?: AgentProviderOptions): Promise<void>;
}

/**
 * Options for agent provider operations.
 */
export interface AgentProviderOptions {
  /**
   * Optional model identifier (e.g., 'gpt-4', 'claude-3', etc.)
   */
  model?: string;
}
