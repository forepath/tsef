/**
 * Cursor ACP long-lived processes sometimes emit this plain assistant text when auth
 * goes stale, instead of a structured JSON-RPC error. See:
 * https://forum.cursor.com/t/cursor-agent-acp-live-process-returns-sign-in-prompt-as-assistant-content-after-auth-state-goes-stale/163787
 */
export const CURSOR_ACP_STALE_AUTH_TEXT = 'Please sign in to continue';

export const CURSOR_ACP_STALE_AUTH_USER_MESSAGE =
  'Cursor agent session expired. Please try sending your message again.';

function normalizeAcpAuthText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/u, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** True when the full assistant reply is only the Cursor stale-auth sign-in line. */
export function isCursorAcpStaleAuthResponse(text: string): boolean {
  const normalized = normalizeAcpAuthText(text);

  if (!normalized) {
    return false;
  }

  return normalized === normalizeAcpAuthText(CURSOR_ACP_STALE_AUTH_TEXT);
}

/**
 * True while streamed text could still become the stale-auth reply (or is empty).
 * Used to hold deltas so we do not flash the sign-in line before a restart/retry.
 */
export function isCursorAcpStaleAuthPrefix(text: string): boolean {
  const normalized = normalizeAcpAuthText(text);

  if (!normalized) {
    return true;
  }

  return normalizeAcpAuthText(CURSOR_ACP_STALE_AUTH_TEXT).startsWith(normalized);
}
