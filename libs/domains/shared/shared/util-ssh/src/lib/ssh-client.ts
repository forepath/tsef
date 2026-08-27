import { createShellExecutor, type RunOptions, type RunResult } from '@forepath/shared/shared/util-shell-executor';

export interface SshTarget {
  host: string;
  user?: string;
  port?: number;
  identityFile?: string;
  proxyJump?: string;
  connectTimeoutSeconds?: number;
  serverAliveIntervalSeconds?: number;
}

export interface SshClientOptions extends RunOptions {
  label?: string;
}

export interface SshClient {
  execRemote(command: string, options?: RunOptions): Promise<RunResult>;
  uploadFile(localPath: string, remotePath: string, options?: RunOptions): Promise<RunResult>;
}

export function summarizeRemoteCommand(command: string): string {
  const line =
    command
      .split('\n')
      .map((entry) => entry.trim())
      .find((entry) => entry.length > 0 && !entry.startsWith('#')) ?? 'remote command';

  return line.length > 100 ? `${line.slice(0, 97)}...` : line;
}

function formatTargetLabel(target: SshTarget, label?: string): string {
  const userHost = target.user ? `${target.user}@${target.host}` : target.host;

  return label ? `${label} (${userHost})` : userHost;
}

export function buildSshConnectionOptions(target: SshTarget): string[] {
  const parts = ['-o BatchMode=yes', '-o StrictHostKeyChecking=accept-new'];

  if (target.connectTimeoutSeconds !== undefined && target.connectTimeoutSeconds > 0) {
    parts.push(`-o ConnectTimeout=${target.connectTimeoutSeconds}`);
  }

  if (target.serverAliveIntervalSeconds !== undefined && target.serverAliveIntervalSeconds > 0) {
    parts.push(`-o ServerAliveInterval=${target.serverAliveIntervalSeconds}`);
  }

  return parts;
}

function buildSshOptions(target: SshTarget): string {
  const parts = [...buildSshConnectionOptions(target)];

  if (target.port) {
    parts.unshift(`-p ${target.port}`);
  }

  if (target.identityFile) {
    parts.unshift(`-i ${target.identityFile}`);
  }

  if (target.proxyJump) {
    parts.unshift(`-J ${target.proxyJump}`);
  }

  return parts.join(' ');
}

function buildSshPrefix(target: SshTarget): string {
  const userHost = target.user ? `${target.user}@${target.host}` : target.host;

  return `ssh ${buildSshOptions(target)} ${userHost}`;
}

function buildScpPrefix(target: SshTarget): string {
  const parts = [...buildSshConnectionOptions(target)];

  if (target.port) {
    parts.push(`-P ${target.port}`);
  }

  if (target.identityFile) {
    parts.push(`-i ${target.identityFile}`);
  }

  if (target.proxyJump) {
    parts.push(`-J ${target.proxyJump}`);
  }

  return `scp ${parts.join(' ')}`.trim();
}

function logRemoteAction(
  logger: RunOptions['logger'],
  targetLabel: string,
  action: string,
  detail: string,
  dryRun: boolean,
): void {
  if (!logger) {
    return;
  }

  const prefix = dryRun ? '[dry-run] ' : '';
  logger.info(`→ ${targetLabel}: ${prefix}${action} — ${detail}`);
}

export function createSshClient(target: SshTarget, defaultOptions: SshClientOptions = {}): SshClient {
  const executor = createShellExecutor(defaultOptions);
  const prefix = buildSshPrefix(target);
  const scpPrefix = buildScpPrefix(target);
  const targetLabel = formatTargetLabel(target, defaultOptions.label);

  return {
    execRemote(command: string, options?: RunOptions): Promise<RunResult> {
      const merged = { ...defaultOptions, ...options };
      const dryRun = merged.dryRun ?? false;

      logRemoteAction(merged.logger, targetLabel, 'ssh exec', summarizeRemoteCommand(command), dryRun);
      merged.logger?.debug(`→ ${targetLabel}: full remote command:\n${command}`);

      const remoteCommand =
        target.user && target.user !== 'root' ? `sudo -n bash -lc ${JSON.stringify(command)}` : command;
      const escaped = remoteCommand.replace(/'/g, `'\\''`);

      return executor.run(`${prefix} '${escaped}'`, options);
    },
    uploadFile(localPath: string, remotePath: string, options?: RunOptions): Promise<RunResult> {
      const merged = { ...defaultOptions, ...options };
      const dryRun = merged.dryRun ?? false;
      const userHost = target.user ? `${target.user}@${target.host}` : target.host;

      logRemoteAction(merged.logger, targetLabel, 'scp upload', `${localPath} → ${remotePath}`, dryRun);

      return executor.run(`${scpPrefix} ${localPath} ${userHost}:${remotePath}`, options);
    },
  };
}

export async function withSsh<T>(
  target: SshTarget,
  fn: (client: SshClient) => Promise<T>,
  options?: SshClientOptions,
): Promise<T> {
  const client = createSshClient(target, options);

  return fn(client);
}
