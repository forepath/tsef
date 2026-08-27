import { Command } from 'commander';

import { createLogger } from '@forepath/shared/shared/util-logger';
import { createShellExecutor } from '@forepath/shared/shared/util-shell-executor';
import { createSshClient } from '@forepath/shared/shared/util-ssh';

import { registerHostCommands } from '@forepath/loadweaver/shared/feature-cli-host';
import {
  registerClusterCommands,
  inspectRemoteDrift,
  persistClusterInventory,
  refreshInventoryFromLive,
  acquireHostLocks,
  releaseHostLocks,
} from '@forepath/loadweaver/shared/feature-cli-cluster';
import { registerCephCommands } from '@forepath/loadweaver/shared/feature-cli-ceph';
import { registerDiagCommands } from '@forepath/loadweaver/shared/feature-cli-diag';
import { registerNodeCommands } from '@forepath/loadweaver/shared/feature-cli-node';
import { registerSwarmCommands } from '@forepath/loadweaver/shared/feature-cli-swarm';
import { registerTraefikCommands } from '@forepath/loadweaver/shared/feature-cli-traefik';
import { registerVipCommands } from '@forepath/loadweaver/shared/feature-cli-vip';
import { registerSshCommands } from '@forepath/loadweaver/shared/feature-cli-ssh';
import { registerRoutingCommands } from '@forepath/loadweaver/shared/feature-cli-routing';
import { registerVolumeCommands } from '@forepath/loadweaver/shared/feature-cli-volume';
import { registerWireguardCommands } from '@forepath/loadweaver/shared/feature-cli-wireguard';

import { loadLoadweaverConfig, resolveSshTarget } from '@forepath/loadweaver/shared/util-cli-core';
import type { GlobalCliOptions, LoadweaverContext } from '@forepath/loadweaver/shared/util-cli-core';
import { registerConfigCommands } from './commands/config.command';
import { registerHelloCommand } from './commands/hello.command';

function buildContext(options: GlobalCliOptions): LoadweaverContext {
  const level = options.debug ? 'debug' : 'info';
  const baseLogger = createLogger({ level, json: options.debug, prefix: 'loadweaver' });
  const logger = options.json
    ? {
        error: baseLogger.error.bind(baseLogger),
        warn: () => undefined,
        info: () => undefined,
        debug: () => undefined,
      }
    : baseLogger;
  const executor = createShellExecutor({ dryRun: options.dryRun, logger });

  const ctx: LoadweaverContext = {
    options,
    executor,
    logger,
    sshForNode(nodeId: string) {
      return createSshClient(this.sshTargetForNode(nodeId), {
        dryRun: options.dryRun,
        logger,
        label: nodeId,
      });
    },
    sshTargetForNode(nodeId: string) {
      if (!this.config) {
        throw new Error('Configuration must be loaded before SSH operations');
      }

      return resolveSshTarget(this.config, nodeId);
    },
  };

  try {
    ctx.config = loadLoadweaverConfig(options.configPath, { env: options.env });
    ctx.inspectDrift = () => inspectRemoteDrift(ctx);
    ctx.persistInventory = (operation) => persistClusterInventory(ctx, operation);
    ctx.refreshInventoryFromLive = () => refreshInventoryFromLive(ctx);
    ctx.acquireHostLocks = (operation) => acquireHostLocks(ctx, operation);
    ctx.releaseHostLocks = (nodeIds) => releaseHostLocks(ctx, nodeIds);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    if (!message.includes('Config file not found')) {
      throw error;
    }
  }

  return ctx;
}

function getCtx(command: Command): LoadweaverContext {
  let current: Command | null = command;

  while (current) {
    const ctx = current.getOptionValue('loadweaverContext') as LoadweaverContext | undefined;

    if (ctx) {
      return ctx;
    }

    current = current.parent;
  }

  throw new Error('Loadweaver context not initialized');
}

export function createProgram(): Command {
  const program = new Command('loadweaver');

  program
    .description('Manage Docker Swarm, WireGuard, Ceph, Traefik, and VIP infrastructure')
    .option('--config <path>', 'Path to loadweaver.yml', './loadweaver.yml')
    .option('--env <profile>', 'Configuration profile overlay')
    .option('--dry-run', 'Print planned commands without executing', false)
    .option('--verbose', 'Enable verbose output', false)
    .option('--debug', 'Enable debug JSON logging', false)
    .option('--yes', 'Skip confirmation prompts', false)
    .option('--accept-drift', 'Refresh inventory from live cluster when drift is detected, then continue', false)
    .option('--local', 'Run commands on the local node only', false)
    .option('--json', 'Emit machine-readable JSON for supported commands', false)
    .hook('preAction', (thisCommand) => {
      const opts = thisCommand.opts<{
        config: string;
        env?: string;
        dryRun?: boolean;
        verbose?: boolean;
        debug?: boolean;
        yes?: boolean;
        acceptDrift?: boolean;
        local?: boolean;
        json?: boolean;
      }>();

      const ctx = buildContext({
        configPath: opts.config,
        env: opts.env,
        dryRun: Boolean(opts.dryRun),
        verbose: Boolean(opts.verbose),
        debug: Boolean(opts.debug),
        yes: Boolean(opts.yes),
        acceptDrift: Boolean(opts.acceptDrift),
        local: Boolean(opts.local),
        json: Boolean(opts.json),
      });

      thisCommand.setOptionValue('loadweaverContext', ctx);
    });

  registerHelloCommand(program, getCtx);
  registerConfigCommands(program, getCtx);
  registerHostCommands(program, getCtx);
  registerClusterCommands(program, getCtx);
  registerNodeCommands(program, getCtx);
  registerWireguardCommands(program, getCtx);
  registerSwarmCommands(program, getCtx);
  registerSshCommands(program, getCtx);
  registerCephCommands(program, getCtx);
  registerVolumeCommands(program, getCtx);
  registerTraefikCommands(program, getCtx);
  registerVipCommands(program, getCtx);
  registerRoutingCommands(program, getCtx);
  registerDiagCommands(program, getCtx);

  return program;
}
