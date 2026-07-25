import { createHash, randomUUID } from 'crypto';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * `email_deliveries.event_id` is a UUID column. Callers may pass a human-readable
 * `correlationId` for idempotent job ids; map non-UUID values to a stable UUID.
 */
export function resolveEmailEventId(correlationId?: string): string {
  if (!correlationId) {
    return randomUUID();
  }

  if (UUID_RE.test(correlationId)) {
    return correlationId;
  }

  const hash = createHash('sha256').update(correlationId).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));

  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant

  const hex = bytes.toString('hex');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
