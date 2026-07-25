/** Primary idempotency key for config-change open positions and credit documents. */
export function configChangePrimarySourceRef(configChangeId: string): string {
  return `config_change:${configChangeId}`;
}

/** Carry-forward credit open position idempotency key after a partial credit document. */
export function configChangeCarrySourceRef(configChangeId: string): string {
  return `config_change:${configChangeId}:carry`;
}
