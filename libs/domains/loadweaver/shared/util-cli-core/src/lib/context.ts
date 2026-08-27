import type { Logger } from '@forepath/shared/shared/util-logger';
import type { ShellExecutor } from '@forepath/shared/shared/util-shell-executor';
import type { SshClient, SshTarget } from '@forepath/shared/shared/util-ssh';

import type { LoadweaverConfig } from './config/schema';
import type { DriftFinding } from './workspace/confirm-drift';

export interface GlobalCliOptions {
  configPath: string;
  env?: string;
  dryRun: boolean;
  verbose: boolean;
  debug: boolean;
  yes: boolean;
  acceptDrift: boolean;
  local: boolean;
  json: boolean;
}

export interface LoadweaverContext {
  options: GlobalCliOptions;
  config?: LoadweaverConfig;
  executor: ShellExecutor;
  logger: Logger;
  inspectDrift?: () => Promise<DriftFinding[]>;
  persistInventory?: (operation: string) => Promise<void>;
  refreshInventoryFromLive?: () => Promise<void>;
  acquireHostLocks?: (operation: string) => Promise<string[]>;
  releaseHostLocks?: (nodeIds: string[]) => Promise<void>;
  sshForNode(nodeId: string): SshClient;
  sshTargetForNode(nodeId: string): SshTarget;
}

export type { LoadweaverConfig };
