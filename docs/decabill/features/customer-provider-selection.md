# Customer provider selection

## Purpose

Service types can expose one or more **interchangeable cloud providers** that share a registry `compatibilityGroup`. Service plans may further restrict that set and opt customers into choosing a provider at checkout (same pattern as [customer server type selection](../../libs/domains/decabill/backend/feature-billing-manager/docs/customer-server-type-selection.md)).

## Provider compatibility

`GET /service-types/providers` returns `compatibilityGroup` on each `ProviderDetail`:

- First-party Hetzner and DigitalOcean use `host-cloud-init`.
- Missing or empty group means the provider is only compatible with itself (fail closed).
- Dynamic metadata plugins should set `compatibilityGroup` when they are interchangeable with another provider.

## Service type fields

| Field              | Meaning                                                                 |
| ------------------ | ----------------------------------------------------------------------- |
| `provider`         | Primary provider id (first of `allowedProviders`); `null` when **None** |
| `allowedProviders` | Ordered interchangeable provider ids; empty = None (no cloud provider)  |

Admin UI rules:

- Multi-select with a persistent **None** option.
- Selecting None clears all providers and clears compatibility filtering.
- Selecting a real provider unselects None and disables incompatible options (same `compatibilityGroup`).
- Unselecting the last real provider auto-selects None.
- `configSchema` is refreshed from the primary provider’s registry metadata when the primary changes.
- Platform `providerDefaults` accept env keys for **all** selected providers.

Webhook (catalog, no email template): `service_type.allowed_providers_changed`.

## Service plan fields

| Field                            | Meaning                                                                                                                                                                                      |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `allowCustomerProviderSelection` | When true, checkout may send `requestedConfig.provider`                                                                                                                                      |
| `allowedProviders`               | Subset of the service type allowlist. With customer selection on: ≥2. With it off and multiple type providers: exactly 1 (admin pin). With a single type provider: that provider is assumed. |

Rules:

- Not allowed when `serviceTypeId` is null or the service type has no providers.
- When the flag is true, the plan allowlist is a customer-facing subset (all type providers selected by default in admin UI). The first entry is the checkout default if the customer omits `provider`.
- When the flag is false and the service type has multiple providers, admin must pin exactly one provider on the plan; orders always use that provider.
- When the flag is false and the service type has a single provider, that provider is used automatically (no admin pick needed).
- Legacy rows with customer selection off and an empty plan allowlist still fall back to the service type primary until edited.
- With customer provider selection and server-type pricing, set `providerConfigDefaults.serverTypeByProvider` so each allowed provider has its own default server type.
- With customer provider selection and geography fields, set `providerConfigDefaults.geographyByProvider` the same way (location/region ids per provider).

Webhook: `service_plan.allowed_providers_changed`.

## Order API (`POST /subscriptions`)

1. If `allowCustomerProviderSelection` is false, `provider` is stripped from `requestedConfig`.
2. If true, client-supplied `provider` is kept (or the plan default is used) and must be in `plan.allowedProviders`.
3. The resolved provider is written to `configSnapshot.provider` and drives availability, geography, server-type catalogs, pricing snapshots, and provisioning.
4. Config schema validation uses the **resolved** provider’s registered schema (Hetzner `location` vs DigitalOcean `region`).

## Availability (`POST /availability/check`)

Resolves the provider from the service type allowlist and optional `requestedConfig.provider`. There is no hard-coded Hetzner fallback; unresolved provider returns 400.

## Public catalog

`PublicServicePlanOffering` includes `allowCustomerProviderSelection` and `allowedProviders` for checkout UIs.

## Related code

- `src/lib/utils/provider-selection.utils.ts`
- Service type / plan controllers, `subscription.service.ts`, `backorder.service.ts`, `availability.controller.ts`
- Migration `1776900000000_AddMultiProviderSelection`
