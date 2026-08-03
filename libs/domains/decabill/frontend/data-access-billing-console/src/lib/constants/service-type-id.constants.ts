/**
 * True when there is no service type (null / undefined / blank).
 * Matches backend `isNoneServiceTypeId` for billing-only plans.
 */
export function isNoneServiceTypeId(value: string | null | undefined): boolean {
  return value == null || value.trim() === '';
}
