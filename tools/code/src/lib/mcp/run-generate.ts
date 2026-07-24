import { spawnSync } from 'child_process';

import { getGeneratorSchema, listGenerators, resolveWorkspaceRoot } from './generators-meta';

export interface RunGenerateOptions {
  generator: string;
  options?: Record<string, unknown>;
  confirm: boolean;
  workspaceRoot?: string;
  dryRun?: boolean;
}

export interface RunGenerateResult {
  ok: boolean;
  command: string[];
  exitCode: number | null;
  stdout: string;
  stderr: string;
  skipped?: boolean;
  reason?: string;
}

function toCliFlags(options: Record<string, unknown>): string[] {
  const flags: string[] = [];
  for (const [key, value] of Object.entries(options)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'boolean') {
      flags.push(value ? `--${key}` : `--no-${key}`);
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        flags.push(`--${key}=${String(item)}`);
      }
      continue;
    }
    flags.push(`--${key}=${String(value)}`);
  }
  return flags;
}

/**
 * Run `nx generate @forepath/code:<generator>` in the workspace.
 * Requires confirm=true unless dryRun is set (Nx --dry-run).
 */
export function runGenerate(options: RunGenerateOptions): RunGenerateResult {
  const known = listGenerators().map((g) => g.name);
  if (!known.includes(options.generator)) {
    throw new Error(`Unknown generator "${options.generator}". Known: ${known.join(', ')}`);
  }

  // Validate schema exists (throws if missing)
  getGeneratorSchema(options.generator);

  const workspaceRoot = options.workspaceRoot ?? resolveWorkspaceRoot();
  const args = ['nx', 'generate', `@forepath/code:${options.generator}`, ...toCliFlags(options.options ?? {})];

  if (options.dryRun) {
    args.push('--dry-run');
  } else if (!options.confirm) {
    return {
      ok: false,
      skipped: true,
      reason: 'Set confirm=true to run a mutating generate (or dryRun=true to preview).',
      command: ['npx', ...args],
      exitCode: null,
      stdout: '',
      stderr: '',
    };
  }

  const result = spawnSync('npx', args, {
    cwd: workspaceRoot,
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 10 * 1024 * 1024,
  });

  return {
    ok: result.status === 0,
    command: ['npx', ...args],
    exitCode: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}
