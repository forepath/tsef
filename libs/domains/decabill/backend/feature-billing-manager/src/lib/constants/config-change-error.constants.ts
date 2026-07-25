import { BadRequestException } from '@nestjs/common';

/**
 * Stable machine-readable error codes for subscription config changes.
 * Clients branch on `code`; the human-readable `message` may change without notice.
 */
export const CONFIG_CHANGE_ERROR_CODES = {
  /** Subscription state (or a concurrent change) forbids requesting a config change. */
  NOT_ELIGIBLE: 'CONFIG_CHANGE_NOT_ELIGIBLE',
  /** The request would not change anything. */
  NOOP: 'CONFIG_CHANGE_NOOP',
  /** The provider does not support the requested server type transition direction. */
  SERVER_TYPE_UNSUPPORTED: 'CONFIG_CHANGE_SERVER_TYPE_UNSUPPORTED',
  /** Target server type costs the same as the current one, so up/down cannot be determined. */
  SERVER_TYPE_LATERAL_UNSUPPORTED: 'CONFIG_CHANGE_SERVER_TYPE_LATERAL_UNSUPPORTED',
  /** Requested addon is unknown, inactive, not offered by the plan, or already in the target state. */
  ADDON_INVALID: 'CONFIG_CHANGE_ADDON_INVALID',
  /** Config values of an already active addon cannot be edited through a config change. */
  ADDON_CONFIG_IMMUTABLE: 'CONFIG_CHANGE_ADDON_CONFIG_IMMUTABLE',
  /** The config change run failed while being applied. */
  FAILED: 'CONFIG_CHANGE_FAILED',
} as const;

export type ConfigChangeErrorCode = (typeof CONFIG_CHANGE_ERROR_CODES)[keyof typeof CONFIG_CHANGE_ERROR_CODES];

export interface ConfigChangeErrorBody {
  statusCode: 400;
  message: string;
  code: ConfigChangeErrorCode;
}

/**
 * Throws a 400 carrying a stable `code` alongside the message so clients can
 * localize and branch without string matching.
 */
export function throwConfigChangeBadRequest(code: ConfigChangeErrorCode, message: string): never {
  throw new BadRequestException({ statusCode: 400, message, code } satisfies ConfigChangeErrorBody);
}
