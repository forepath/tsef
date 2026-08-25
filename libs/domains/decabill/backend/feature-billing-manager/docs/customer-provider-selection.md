# Customer provider selection

Library-level notes for Decabill billing manager. Product docs: [customer-provider-selection.md](../../../../../../docs/decabill/features/customer-provider-selection.md).

## Helpers

`src/lib/utils/provider-selection.utils.ts`:

- `normalizeAllowedProviders` / `resolvePrimaryProvider`
- `resolveServiceTypeAllowedProviders` / `resolvePlanAllowedProviders`
- `resolveEffectiveProvider` / `stripProviderFromRequestedConfig` / `assertProviderAllowed`
- `assertProvidersCompatible` / `providersAreCompatible` / `HOST_CLOUD_INIT_COMPATIBILITY_GROUP`

## Persistence

- `billing_service_types.provider` nullable; `allowed_providers` jsonb
- `billing_service_plans.allow_customer_provider_selection`; `allowed_providers` jsonb
- Migration: `apps/decabill/backend-billing-manager/src/migrations/1776900000000_AddMultiProviderSelection.ts`

## Notifications

Webhook-only events in `BILLING_NOTIFICATION_EVENTS`:

- `service_type.allowed_providers_changed`
- `service_plan.allowed_providers_changed`
