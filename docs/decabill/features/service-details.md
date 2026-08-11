# Service details

Customer and admin views for a provisioned subscription item (cloud service instance), including live status, displayable server metadata, optional rename, and usage-meter history charts.

## Routes

| Audience | Path                                                               |
| -------- | ------------------------------------------------------------------ |
| Customer | `/subscriptions/{subscriptionId}/services/{itemId}`                |
| Admin    | `/administration/subscriptions/{subscriptionId}/services/{itemId}` |

Customer deep links also come from the dashboard cloud-instances lane. Admin entry is from the Contracts list (`/administration/subscriptions`) nested services subsection (there is no admin dashboard). Items on terminal subscriptions (`canceled`, `pending_withdrawal`, `pending_instant_cancel`), failed items, and active items without a live provider show as **Removed** in the list and **cannot** open this page (UI hides the action; API returns 404). Dashboard continues to list only active provisioned items.

## Display name

Each subscription item may store an optional `displayName` override (`billing_subscription_items.display_name`).

- Default label: catalog `serviceTypeName` (or integrated service kind).
- Override is shown anywhere that label appears (dashboard, subscriptions / contracts subsections, detail header, websocket status payloads).
- Does **not** change the subscription reference (`SUB-*`).

### API

Customer: `POST /subscriptions/{subscriptionId}/items/{itemId}/display-name`

Admin: `POST /admin/billing/subscriptions/{subscriptionId}/items/{itemId}/display-name` (`billing_admin:write`)

```json
{ "displayName": "Prod API" }
```

Send `null` or an empty/whitespace string to clear the override.

### UI

Inline rename follows the project-ticket pattern: click the title → input → blur commits. A trashcan clears the draft; blur with an empty draft resets to the default name.

## Detail API

Customer: `GET /subscriptions/{subscriptionId}/items/{itemId}` returns the item plus displayable `serverInfo` (IPs, hostname/FQDN, status, metadata). Detail-eligible only when the parent subscription is still live (`active`, `pending_cancel`, `pending_config_change`, or `pending_backorder`), `provisioningStatus === active`, and a live provider reference exists (`hasProviderReference` on list payloads; the reference value is never returned).

Admin twins live under `/admin/billing/subscriptions/{subscriptionId}/items/...` (`billing_admin:read` / `billing_admin:write`) and do not require subscription ownership.

## Meter history

| Audience | Path                                                                            | PAT scope                   |
| -------- | ------------------------------------------------------------------------------- | --------------------------- |
| Customer | `GET /subscriptions/{subscriptionId}/meters/history?from&to&groupBy=day\|month` | ownership + existing scopes |
| Admin    | `GET /admin/billing/subscriptions/{subscriptionId}/meters/history?...`          | `billing_admin:read`        |

Returns per-meter series using each meter’s catalog aggregator within day/month buckets of `periodEnd`. The service detail page filters with a collapsible `from` / `to` / `groupBy` panel (customer-facing adaptation of admin billing filters; no `userId`).

## Realtime

Billing namespace (`/billing`):

- `dashboardStatusUpdate` — live status (includes `displayName`); customer-owned subscriptions only
- `subscribeSubscriptionMeters` / `unsubscribeSubscriptionMeters` — room `subscription:{id}`
- `meterSummaryUpdate` — current meter summaries after usage mutations

Customers must own the subscription to join the meter room. **ADMIN** sockets may join any tenant subscription after an existence check (no ownership required).

## Notifications

| Event                                                    | When                               |
| -------------------------------------------------------- | ---------------------------------- |
| `subscription.service.renamed`                           | Display name set or cleared        |
| `subscription.service.started` / `stopped` / `restarted` | Power actions                      |
| `subscription.service.removed`                           | Item deprovisioned during teardown |

## Related

- [Subscriptions](./subscriptions.md)
- [Usage meters](./usage-meters.md)
- [Billing administration](./billing-administration.md)
