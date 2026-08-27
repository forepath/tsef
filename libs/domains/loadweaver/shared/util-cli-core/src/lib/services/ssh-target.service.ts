import type { SshTarget } from '@forepath/shared/shared/util-ssh';

import { DEFAULT_SSH_CONNECT_TIMEOUT_SECONDS, DEFAULT_SSH_SERVER_ALIVE_INTERVAL_SECONDS } from '../config/ssh-defaults';
import type { LoadweaverConfig } from '../config/schema';
import { resolveNodeHost } from './node-registry.service';

export function resolveSshTarget(config: LoadweaverConfig, nodeId: string): SshTarget {
  const node = config.nodes[nodeId];

  if (!node) {
    throw new Error(`Unknown node: ${nodeId}`);
  }

  return {
    host: resolveNodeHost(config, nodeId),
    user: node.sshUser ?? config.ssh?.user ?? 'root',
    port: node.sshPort ?? config.ssh?.port,
    identityFile: node.identityFile ?? config.ssh?.identityFile,
    proxyJump: node.proxyJump ?? config.ssh?.proxyJump,
    connectTimeoutSeconds: config.ssh?.connectTimeoutSeconds ?? DEFAULT_SSH_CONNECT_TIMEOUT_SECONDS,
    serverAliveIntervalSeconds: config.ssh?.serverAliveIntervalSeconds ?? DEFAULT_SSH_SERVER_ALIVE_INTERVAL_SECONDS,
  };
}
