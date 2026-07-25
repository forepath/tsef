import { HttpErrorResponse } from '@angular/common/http';

import {
  CONFIG_CHANGE_ERROR_CODES,
  type ConfigChangeErrorCode,
  type ConfigChangeFailure,
} from '../types/config-change.types';

const FALLBACK_MESSAGE = 'An unexpected error occurred';

function isConfigChangeErrorCode(value: unknown): value is ConfigChangeErrorCode {
  return typeof value === 'string' && (CONFIG_CHANGE_ERROR_CODES as readonly string[]).includes(value);
}

function readErrorBody(error: unknown): Record<string, unknown> | null {
  const body = error instanceof HttpErrorResponse ? error.error : error;

  return body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
}

/**
 * Normalizes a failed config-change call into a message plus the stable backend code.
 * Callers branch on `code` and localize; `message` is only a fallback for unknown codes.
 */
export function toConfigChangeFailure(error: unknown): ConfigChangeFailure {
  const body = readErrorBody(error);
  const code = isConfigChangeErrorCode(body?.['code']) ? body['code'] : null;

  if (typeof body?.['message'] === 'string' && body['message'].trim()) {
    return { message: body['message'], code };
  }

  if (Array.isArray(body?.['message']) && body['message'].length > 0) {
    return { message: body['message'].map(String).join(', '), code };
  }

  if (typeof error === 'string' && error.trim()) {
    return { message: error, code };
  }

  if (error instanceof Error && error.message.trim()) {
    return { message: error.message, code };
  }

  return { message: FALLBACK_MESSAGE, code };
}
