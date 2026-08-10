/**
 * Coerce values from `type="number"` + ngModel (string | number | null) to a trimmed string.
 * Empty / null clears the optional override.
 */
export function optionalNumberInputValue(raw: string | number | null | undefined): string {
  if (raw == null || raw === '') {
    return '';
  }

  return String(raw).trim();
}
