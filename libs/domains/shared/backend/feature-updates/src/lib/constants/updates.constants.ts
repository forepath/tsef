import type { UpdatesModuleOptions } from '../interfaces/updates-module.options';

export const UPDATES_MODULE_OPTIONS = Symbol('UPDATES_MODULE_OPTIONS');

export const UPDATE_CHECK_JOB_NAME = 'update-check';

export const INSTANCE_HEARTBEAT_TTL_SECONDS = 300;

export const DEFAULT_HEARTBEAT_INTERVAL_MS = 60_000;

export const UPDATE_CHECK_GITHUB_TOKEN_ENV = 'UPDATE_CHECK_GITHUB_TOKEN';

export function resolveUpdatesKeyPrefix(applicationId?: UpdatesModuleOptions['applicationId']): string {
  return applicationId ?? 'updates';
}

export function buildUpdatesReleaseKey(keyPrefix: string): string {
  return `${keyPrefix}:updates:release`;
}

export function buildUpdatesInstanceKey(keyPrefix: string, instanceId: string): string {
  return `${keyPrefix}:updates:instance:${instanceId}`;
}

export function buildUpdatesInstanceScanPattern(keyPrefix: string): string {
  return `${keyPrefix}:updates:instance:*`;
}

export function buildUpdatesCheckJobKey(keyPrefix: string): string {
  return `${keyPrefix}:updates:check-job`;
}
