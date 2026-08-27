import { createLogger, type Logger } from '@forepath/shared/shared/util-logger';

export interface RunResult {
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  dryRun: boolean;
}

export interface RunOptions {
  cwd?: string;
  env?: Record<string, string>;
  dryRun?: boolean;
  logger?: Logger;
  stdin?: string;
}

export interface ShellExecutor {
  run(command: string, options?: RunOptions): Promise<RunResult>;
  runScript(lines: string[], options?: RunOptions): Promise<RunResult[]>;
}

export function createShellExecutor(defaultOptions: RunOptions = {}): ShellExecutor {
  const logger = defaultOptions.logger ?? createLogger({ prefix: 'exec' });

  async function run(command: string, options: RunOptions = {}): Promise<RunResult> {
    const merged = { ...defaultOptions, ...options };
    const dryRun = merged.dryRun ?? false;

    if (dryRun) {
      logger.debug(`[dry-run] ${command}`);
      return { command, stdout: '', stderr: '', exitCode: 0, dryRun: true };
    }

    logger.debug(`running: ${command}`);

    const { exec } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execAsync = promisify(exec);

    try {
      const result = await execAsync(command, {
        cwd: merged.cwd,
        env: { ...process.env, ...merged.env },
        maxBuffer: 10 * 1024 * 1024,
      });

      return {
        command,
        stdout: result.stdout?.toString() ?? '',
        stderr: result.stderr?.toString() ?? '',
        exitCode: 0,
        dryRun: false,
      };
    } catch (error: unknown) {
      const execError = error as { stdout?: Buffer; stderr?: Buffer; code?: number; message?: string };

      return {
        command,
        stdout: execError.stdout?.toString() ?? '',
        stderr: execError.stderr?.toString() ?? execError.message ?? '',
        exitCode: execError.code ?? 1,
        dryRun: false,
      };
    }
  }

  return {
    run,
    async runScript(lines: string[], options: RunOptions = {}): Promise<RunResult[]> {
      const results: RunResult[] = [];

      for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith('#')) {
          continue;
        }

        results.push(await run(trimmed, options));

        const last = results[results.length - 1];

        if (last.exitCode !== 0) {
          break;
        }
      }

      return results;
    },
  };
}
