/**
 * Server type selection for provisioning plans uses `basePriceFromField: 'serverType'` in provider schemas.
 * These helpers gate customer overrides and validate allowed types on order.
 */

export interface JsonSchemaLike {
  basePriceFromField?: unknown;
}

/** Admin-only map on providerConfigDefaults: provider id → default server type id. */
export const SERVER_TYPE_BY_PROVIDER_KEY = 'serverTypeByProvider';

/**
 * True when the schema defines server type as the field that drives base price.
 */
export function providerConfigSchemaSupportsServerTypeSelection(schema: unknown): boolean {
  if (!schema || typeof schema !== 'object') return false;

  const field = (schema as JsonSchemaLike).basePriceFromField;

  return field === 'serverType';
}

/**
 * Service types often persist `configSchema` as `{}` and rely on the provider's registered default schema.
 */
export function effectiveSchemaSupportsServerTypeSelection(
  serviceTypeConfigSchema: unknown,
  providerRegisteredConfigSchema: unknown | undefined,
): boolean {
  if (providerConfigSchemaSupportsServerTypeSelection(serviceTypeConfigSchema)) {
    return true;
  }

  return providerConfigSchemaSupportsServerTypeSelection(providerRegisteredConfigSchema);
}

/**
 * Shallow copy of requestedConfig without serverType when customer selection is disabled.
 */
export function stripServerTypeFromRequestedConfig(
  requestedConfig: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const src = requestedConfig ?? {};
  const out: Record<string, unknown> = { ...src };

  delete out['serverType'];

  return out;
}

/**
 * Remove admin-only serverTypeByProvider from a merged effective config (not a provisioning field).
 */
export function stripServerTypeByProviderFromConfig(config: Record<string, unknown>): void {
  delete config[SERVER_TYPE_BY_PROVIDER_KEY];
}

/**
 * Normalize provider → server type map: non-empty string keys/values, order not significant.
 */
export function normalizeServerTypeByProvider(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const out: Record<string, string> = {};

  for (const [providerId, serverType] of Object.entries(value as Record<string, unknown>)) {
    const provider = typeof providerId === 'string' ? providerId.trim() : '';
    const typeId = typeof serverType === 'string' ? serverType.trim() : '';

    if (!provider || !typeId) {
      continue;
    }

    out[provider] = typeId;
  }

  return out;
}

/**
 * Default server type for a provider: serverTypeByProvider[provider] then top-level serverType.
 */
export function resolveDefaultServerTypeForProvider(
  providerConfigDefaults: Record<string, unknown> | null | undefined,
  providerId: string | null | undefined,
): string | null {
  const defaults = providerConfigDefaults ?? {};
  const provider = typeof providerId === 'string' ? providerId.trim() : '';
  const byProvider = normalizeServerTypeByProvider(defaults[SERVER_TYPE_BY_PROVIDER_KEY]);

  if (provider && byProvider[provider]) {
    return byProvider[provider];
  }

  const legacy = defaults['serverType'];

  if (typeof legacy === 'string' && legacy.trim()) {
    return legacy.trim();
  }

  return null;
}

/**
 * Returns an error message when serverType is not in the allowed list, or null when valid.
 */
export function assertServerTypeAllowed(serverType: string, allowedServerTypes: string[]): string | null {
  const trimmed = serverType?.trim();

  if (!trimmed) {
    return 'serverType is required';
  }

  if (!Array.isArray(allowedServerTypes) || allowedServerTypes.length === 0) {
    return 'No server types are configured for customer selection on this plan';
  }

  if (!allowedServerTypes.includes(trimmed)) {
    return `serverType "${trimmed}" is not allowed for this plan`;
  }

  return null;
}

/**
 * Normalizes allowed server types: non-empty strings only, deduplicated, order preserved.
 */
export function normalizeAllowedServerTypes(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    if (typeof value !== 'string') continue;

    const trimmed = value.trim();

    if (!trimmed || seen.has(trimmed)) continue;

    seen.add(trimmed);
    out.push(trimmed);
  }

  return out;
}
