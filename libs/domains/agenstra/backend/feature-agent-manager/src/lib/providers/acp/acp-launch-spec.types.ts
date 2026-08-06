/**
 * How to spawn an ACP-speaking agent process inside a worker container.
 */
export interface AcpLaunchSpec {
  executable: string;
  args: string[];
  cwd: string;
  supportsLoadSession: boolean;
}

export interface AcpSessionKey {
  agentId: string;
  containerId: string;
  resumeSessionSuffix?: string;
}
