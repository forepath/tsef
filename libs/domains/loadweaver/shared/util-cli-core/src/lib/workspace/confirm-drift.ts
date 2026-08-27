import * as readline from 'node:readline/promises';

export interface DriftFinding {
  code: string;
  message: string;
}

export type DriftConfirmDecision = 'proceed' | 'skip' | 'none';

export interface ConfirmDriftOptions {
  yes: boolean;
  acceptDrift: boolean;
  dryRun: boolean;
  operation: string;
}

export async function confirmProceedAfterDrift(
  drifts: DriftFinding[],
  options: ConfirmDriftOptions,
): Promise<DriftConfirmDecision> {
  if (drifts.length === 0 || options.dryRun) {
    return 'none';
  }

  if (options.yes) {
    return 'proceed';
  }

  if (options.acceptDrift) {
    return 'skip';
  }

  console.error(`Remote drift detected before ${options.operation}:`);

  for (const drift of drifts) {
    console.error(`  - [${drift.code}] ${drift.message}`);
  }

  if (!process.stdin.isTTY) {
    throw new Error(
      'Remote drift detected. Re-run with --yes to proceed (overwrite live) or --accept-drift to refresh inventory from live, then continue.',
    );
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  const answer = await rl.question(
    'Proceed and overwrite remote changes [y], skip drift and refresh inventory then continue [s], or abort [N]? ',
  );
  rl.close();

  const normalized = answer.trim().toLowerCase();

  if (normalized === 'y' || normalized === 'yes') {
    return 'proceed';
  }

  if (normalized === 's' || normalized === 'skip') {
    return 'skip';
  }

  throw new Error('Aborted: remote drift detected and operator declined to proceed.');
}
