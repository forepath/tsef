const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * True when there is no service type (null / undefined, or blank string treated as absent).
 * Used for billing-only plans that deploy nothing.
 */
export function isNoneServiceTypeId(value: string | null | undefined): boolean {
  return value == null || value.trim() === '';
}

/** Map a DB UUID (or null) to the API value (null when unset). */
export function toApiServiceTypeId(dbValue: string | null | undefined): string | null {
  if (isNoneServiceTypeId(dbValue)) {
    return null;
  }

  return dbValue as string;
}

/**
 * Map an API service type id to a DB UUID or null.
 * Accepts null / undefined / blank (none) or a UUID v4.
 */
export function fromApiServiceTypeId(apiValue: string | null | undefined): string | null {
  if (isNoneServiceTypeId(apiValue)) {
    return null;
  }

  return (apiValue as string).trim();
}

/** Returns true when the API value is null/undefined/blank or a UUID v4. */
export function isValidApiServiceTypeId(apiValue: string | null | undefined): boolean {
  if (isNoneServiceTypeId(apiValue)) {
    return true;
  }

  return UUID_V4_PATTERN.test((apiValue as string).trim());
}

/**
 * Parse and validate an API service type id.
 * @throws Error with a stable message when invalid (callers typically wrap as BadRequestException).
 */
export function parseApiServiceTypeId(apiValue: string | null | undefined): string | null {
  if (!isValidApiServiceTypeId(apiValue)) {
    throw new Error('Service type ID must be a UUID or null');
  }

  return fromApiServiceTypeId(apiValue);
}
