import type { RunResult } from '@forepath/shared/shared/util-shell-executor';

export function assertRemoteSuccess(result: RunResult, operation: string): void {
  if (result.dryRun) {
    return;
  }

  if (result.exitCode !== 0) {
    const details = (result.stderr || result.stdout || 'no output').trim();
    throw new Error(`${operation} failed (exit ${result.exitCode}): ${details}`);
  }
}

export function isRemoteAlreadyExists(result: RunResult): boolean {
  const output = `${result.stdout}\n${result.stderr}`.toLowerCase();

  return output.includes('already exists') || output.includes('already part of a swarm');
}
