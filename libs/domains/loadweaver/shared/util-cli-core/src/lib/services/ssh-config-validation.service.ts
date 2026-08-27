import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import type { Logger } from '@forepath/shared/shared/util-logger';
import type { ShellExecutor } from '@forepath/shared/shared/util-shell-executor';

import { buildSshConnectionOptions } from '@forepath/shared/shared/util-ssh';

import { DEFAULT_SSH_CONNECT_TIMEOUT_SECONDS, DEFAULT_SSH_SERVER_ALIVE_INTERVAL_SECONDS } from '../config/ssh-defaults';
import type { LoadweaverConfig } from '../config/schema';
import type { PrerequisiteCheck } from './prerequisite.service';

function sshProbeOptions(config: LoadweaverConfig): string {
  return buildSshConnectionOptions({
    host: '',
    connectTimeoutSeconds: config.ssh?.connectTimeoutSeconds ?? DEFAULT_SSH_CONNECT_TIMEOUT_SECONDS,
    serverAliveIntervalSeconds: config.ssh?.serverAliveIntervalSeconds ?? DEFAULT_SSH_SERVER_ALIVE_INTERVAL_SECONDS,
  }).join(' ');
}

function expandHome(filePath: string): string {
  if (filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2));
  }

  return filePath;
}

function collectIdentityFiles(config: LoadweaverConfig): Array<{ nodeId: string | 'global'; identityFile: string }> {
  const entries: Array<{ nodeId: string | 'global'; identityFile: string }> = [];

  if (config.ssh?.identityFile) {
    entries.push({ nodeId: 'global', identityFile: config.ssh.identityFile });
  }

  for (const [nodeId, node] of Object.entries(config.nodes)) {
    if (node.identityFile) {
      entries.push({ nodeId, identityFile: node.identityFile });
    }
  }

  return entries;
}

function collectProxyJumps(config: LoadweaverConfig): string[] {
  const jumps = new Set<string>();

  if (config.ssh?.proxyJump) {
    jumps.add(config.ssh.proxyJump);
  }

  for (const node of Object.values(config.nodes)) {
    if (node.proxyJump) {
      jumps.add(node.proxyJump);
    }
  }

  return [...jumps];
}

export function validateSshIdentityFiles(config: LoadweaverConfig): PrerequisiteCheck[] {
  const checks: PrerequisiteCheck[] = [];

  for (const entry of collectIdentityFiles(config)) {
    const resolved = expandHome(entry.identityFile);

    if (!fs.existsSync(resolved)) {
      checks.push({
        name: entry.nodeId === 'global' ? 'ssh.identityFile' : `node-${entry.nodeId}-identityFile`,
        passed: false,
        message: `SSH identity file does not exist: ${entry.identityFile} (resolved to ${resolved})`,
      });
      continue;
    }

    checks.push({
      name: entry.nodeId === 'global' ? 'ssh.identityFile' : `node-${entry.nodeId}-identityFile`,
      passed: true,
      message: `SSH identity file found: ${entry.identityFile}`,
    });
  }

  return checks;
}

export async function warnUnreachableProxyJumps(
  config: LoadweaverConfig,
  executor: ShellExecutor,
  logger: Logger,
  dryRun: boolean,
): Promise<void> {
  if (dryRun) {
    return;
  }

  for (const proxyJump of collectProxyJumps(config)) {
    const result = await executor.run(`ssh ${sshProbeOptions(config)} ${proxyJump} true`);

    if (result.exitCode !== 0) {
      logger.warn(
        `SSH proxy jump host may be unreachable: ${proxyJump} (exit=${result.exitCode}). Mutations may fail until connectivity is restored.`,
      );
    }
  }
}
