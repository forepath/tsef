function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Deep-merge overlay onto base. Overlay wins on conflicts.
 * - Plain objects merge recursively
 * - Arrays and primitives are replaced by overlay
 * - Undefined overlay values are skipped (do not delete base keys)
 */
export function deepMerge<T>(base: T, overlay: unknown): T {
  if (overlay === undefined) {
    return base;
  }

  if (!isPlainObject(base) || !isPlainObject(overlay)) {
    return overlay as T;
  }

  const result: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(overlay)) {
    if (value === undefined) {
      continue;
    }

    const existing = result[key];

    if (isPlainObject(existing) && isPlainObject(value)) {
      result[key] = deepMerge(existing, value);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}
