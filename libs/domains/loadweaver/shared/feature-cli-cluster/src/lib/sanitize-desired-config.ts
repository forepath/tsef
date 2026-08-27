import type { LoadweaverConfig } from '@forepath/loadweaver/shared/util-cli-core';

export const AUTH_PASS_REDACTED = '[redacted]';

export function sanitizeDesiredConfig(config: LoadweaverConfig): LoadweaverConfig {
  const desired = structuredClone(config);

  if (desired.vip?.authPass) {
    desired.vip.authPass = AUTH_PASS_REDACTED;
  }

  for (const pool of desired.vip?.pools ?? []) {
    if (pool.authPass) {
      pool.authPass = AUTH_PASS_REDACTED;
    }
  }

  return desired;
}
