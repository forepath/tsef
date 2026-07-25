# Subscription Config Change (Up-/Downgrade)

Customers can modify the **configuration of an active plan** without switching plans or products. Supported changes:

- In-place **server type** upgrade or downgrade (when the provider supports that direction)
- **Add** or **remove** addons on the live subscription

Location / region changes and plan/product switches are out of scope.

## Eligibility

Only subscriptions with `status === active` may start a config change. Blocked:

- `pending_cancel`, `pending_withdrawal`, `pending_backorder`, `canceled`
- Another in-flight `pending_config_change`

The subscription moves to `pending_config_change` while the async worker applies the request, then returns to `active` (success or failure).

## Provider capabilities

Provisioning providers declare two fail-closed flags:

| Flag                          | Meaning                                  |
| ----------------------------- | ---------------------------------------- |
| `supportsServerTypeUpgrade`   | In-place resize to a more expensive type |
| `supportsServerTypeDowngrade` | In-place resize to a cheaper type        |

Built-in Hetzner and DigitalOcean register both `true`. Dynamic plugins must opt in. Equal-price (“lateral”) server-type changes are **rejected** — there is no lateral-change rule.

Server type changes use the provider resize APIs (never recreate/destroy the VM). Location is never accepted on this path.

## Addons

Mid-life add/remove uses the same catalog as order-time addons. See [Addons](./addons.md).

- Existing active addon **configuration cannot be edited** in this flow
- Removing an addon clears its `configSnapshot` (secrets nuked)
- Re-adding later creates a new row with fresh config
- Cloud-init removals run optional `deprovisionScriptTemplate` over SSH; empty template = status-only

## UI

The billing console **Modify configuration** modal mirrors the Order Plan wizard: conditional steps (server type, addons, summary) with a live pricing panel and billing disclaimer. Preview amounts are **advisory**; submit recalculates server-side.

## API

| Method | Path                                            | Scope                 | Purpose                                   |
| ------ | ----------------------------------------------- | --------------------- | ----------------------------------------- |
| GET    | `/subscriptions/{id}/config-change/eligibility` | `subscriptions:read`  | Capabilities, current type, active addons |
| POST   | `/subscriptions/{id}/config-change/preview`     | `subscriptions:read`  | Advisory delta + disclaimer               |
| POST   | `/subscriptions/{id}/config-change`             | `subscriptions:write` | Accept intent (sync marker + queue)       |

Request body may include `serverType`, `addAddonIds`, `removeAddonIds`, and `addonConfigs` (new adds only). Validation failures return Nest `400` with `{ message, code }` (stable codes such as `CONFIG_CHANGE_NOT_ELIGIBLE`, `CONFIG_CHANGE_SERVER_TYPE_LATERAL_UNSUPPORTED`).

## Async processing

1. Sync API writes encrypted `requestedPayload`, sets subscription `pending_config_change`, emits `subscription.config_change_requested`
2. BullMQ coordinator (`CONFIG_CHANGE_SCHEDULER_INTERVAL`, default 30s) enqueues unit jobs
3. Worker: claim CAS → resize → remove addons → add addons → one-shot billing → complete
4. Each successful step commits operational snapshots immediately and records `appliedSteps`
5. One-shot billing runs **only** if every requested step succeeded
6. Failures mark the change `failed`, return subscription to `active`, emit `subscription.config_change_failed` — no infra rollback; no one-shot billing

Stuck `processing` rows are reclaimed once after `CONFIG_CHANGE_PROCESSING_TIMEOUT_MS` (default 15m); a second timeout fails the change. Failed rows are terminal — customers must **submit a new** request against current committed state.

## Billing

| Mode                                   | Behavior                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Post-usage (`billInAdvance === false`) | Partial open position for elapsed period at **old** price; billing anchor reset to change instant |
| Pre-usage, not yet billed              | Negative open-position adjustment (`adjustmentKind: config_change_credit`)                        |
| Pre-usage, already billed              | Partial credit note (`reason: config_change`) via the existing credit/eInvoice/DATEV path         |
| Absolute gross &lt; €0.01              | `billingOutcome: none` (audit only); post-usage still resets the anchor when the change succeeds  |

Rounding and tax follow `TaxCalculationService` (half-up to 2 decimals; net → tax → gross). Active promotions carry over; discounts apply to net before tax.

**Recurring billing authority:** After any step commits to item/addon snapshots, subsequent period charges use those committed prices **even if** the config-change row ends `failed`.

## Notifications

| Event                                  | When                          |
| -------------------------------------- | ----------------------------- |
| `subscription.config_change_requested` | Intent accepted               |
| `subscription.config_changed`          | Worker completed successfully |
| `subscription.config_change_failed`    | Worker failed                 |

Nested addon lifecycle events (`addon.activated`, `addon.deactivated`, `addon.*_failed`) and `invoice.partial_credit_issued` are reused. Payloads never include secrets, interpolated scripts, or decrypted config.

## Security

- PAT: reuse `subscriptions:read` / `subscriptions:write`
- Encrypted storage: `requestedPayload` and addon `configSnapshot` via AES-256-GCM JSON transformers
- Logs / webhooks / emails / DTOs: no config secrets, credentials, or decrypted payloads

## Operations

### Environment knobs

Tune on **scheduler** and **worker** (same env as the API). Full table: [Environment configuration](../deployment/environment-configuration.md).

| Variable                              | Default  | Purpose                                                                  |
| ------------------------------------- | -------- | ------------------------------------------------------------------------ |
| `CONFIG_CHANGE_SCHEDULER_INTERVAL`    | `30000`  | Coordinator poll interval (ms) for pending / stuck config-change rows    |
| `CONFIG_CHANGE_SCHEDULER_BATCH_SIZE`  | `100`    | Max pending + reclaim candidates claimed per coordinator tick            |
| `CONFIG_CHANGE_PROCESSING_TIMEOUT_MS` | `900000` | Stuck `processing` reclaim threshold (15m); second timeout fails the row |

Related addon SSH timeout (mid-life cloud-init provision/deprovision): `BILLING_ADDON_SSH_COMMAND_TIMEOUT_MS` (default `120000`). See [Addons](./addons.md).

Job names: `subscription-config-change.coordinator` / `subscription-config-change.unit` — see [Background jobs](../deployment/background-jobs.md).

### Empty deprovision script = status-only

For `cloud_init_script` addons, leave `deprovisionScriptTemplate` empty (or unset) when mid-life removal should **not** run remote undo. The worker still marks the subscription addon `inactive` and clears `configSnapshot`. Modules always use `teardown` when present.

Operators who need real remote cleanup must set a reverse script (or module teardown) before offering mid-life remove in production.

### Dynamic providers and resize flags

Built-in Hetzner / DigitalOcean set both resize flags. **Dynamic** billing provider metadata must set `supportsServerTypeUpgrade` and/or `supportsServerTypeDowngrade` explicitly when in-place resize is supported. Omitted flags are treated as `false` (fail closed). Without them, customers cannot change server type on that provider even if `changeServerType` exists in code. See [Dynamic provider plugins](./dynamic-provider-plugins.md).

### Operator expectations after failure

- Partial infra may already be committed (resize and/or some addons); one-shot billing did not run
- Recurring billing follows committed snapshots
- Failed change rows are terminal — customer must submit a **new** request
- Do not expect automatic infra rollback

## Related

- [Subscriptions](./subscriptions.md)
- [Addons](./addons.md)
- [Webhooks](./webhooks.md)
- [Email notifications](./email-notifications.md)
- [Advance billing and yearly interval](./advance-billing-and-yearly-interval.md)
- [Dynamic provider plugins](./dynamic-provider-plugins.md)
- [Environment configuration](../deployment/environment-configuration.md)
- [Operator runbook](../deployment/operator-runbook.md)
