# Automatic daily price recalculation

Opt-in nightly refresh of service-plan package prices from the cloud provider catalog, with prorated subscription settlement, statutory withdrawal restart, and consolidated customer email.

## Overview

When a service plan has **`autoRecalculatePriceDaily`** enabled, Decabill recalculates the commercial base price from the provider’s live `priceMonthly` for the plan’s pricing server type (plus stored margins). Eligible subscriptions on that plan are migrated to the new price with the same billing settlement rules as [subscription config change](./subscription-config-change.md).

**Default off** on every plan. Price adjustments are strongly regulated in the EU; operators must explicitly accept the risk per product. Deployments can also disable the job entirely via env.

## Feature switches

| Layer              | Key / field                                                                            | Default   | Purpose                                                           |
| ------------------ | -------------------------------------------------------------------------------------- | --------- | ----------------------------------------------------------------- |
| Ops kill switch    | `BILLING_PRICE_RECALC_ENABLED`                                                         | `true`    | When `false`, the repeatable BullMQ coordinator is not registered |
| Per-product opt-in | `billing_service_plans.auto_recalculate_price_daily` / API `autoRecalculatePriceDaily` | `false`   | Explicit admin acceptance on create/edit                          |
| Admin UI           | Service plans page checkbox                                                            | unchecked | Only place operators enable the feature per package               |

Schedule (when enabled): cron `BILLING_PRICE_RECALC_CRON` (default `0 0 * * *`) in timezone `BILLING_PRICE_RECALC_TIMEZONE` (default `Europe/Berlin`).

## What is recalculated

- Plan `basePrice` from live provider catalog for the plan’s default / configured server type
- Each eligible subscription’s effective infra base (`configSnapshot.billingBasePrice`) for its server type
- Package total remains `base + base×(marginPercent/100) + marginFixed` via `PricingService`
- **Addons are out of scope** (unit price snapshots unchanged)
- Plans without a resolvable catalog price are skipped (logged)

## Subscription eligibility

| Status                  | Migrated?                      |
| ----------------------- | ------------------------------ |
| `active`                | Yes                            |
| `pending_cancel`        | Yes (still in current period)  |
| `pending_config_change` | No (avoid racing tech changes) |
| `pending_backorder`     | No                             |
| `pending_withdrawal`    | No                             |
| `canceled`              | No                             |

If the computed period net is unchanged, no billing, email, or withdrawal restart runs for that subscription.

## Billing settlement

Reuses the shared period-price-change settlement path used by config changes:

1. Branch on `plan.billInAdvance`
2. Prepaid: `OpenPositionsRepository.hasUnbilledForSubscription` (`invoice_ref_id IS NULL`) decides unbilled vs already-invoiced
3. Arrear: elapsed share of old period net as OP; move `currentPeriodStart` to change time
4. Prepaid + already billed + negative delta: partial credit document (PDF + eInvoice), not a payment-processor cash refund

Idempotency source refs: `price_recalc:{runDate}:{subscriptionId}` (+ `:carry`). Adjustment kinds: `price_recalc_arrear` / `price_recalc_charge` / `price_recalc_credit`. Credit reason: `price_recalc`.

## DATEV

No new mapper. Partial credit documents are included by `findWithdrawnInPeriod` (no reason filter). Charge/credit open positions enter DATEV when later invoiced through the normal invoice export path.

## Statutory withdrawal

- Period length: global env `BILLING_STATUTORY_WITHDRAWAL_PERIOD_DAYS` (default `14`) via `getStatutoryWithdrawalPeriodDays()`
- On a real price migration, `subscriptions.statutory_withdrawal_restarted_at` is set; `WithdrawalPolicyService` uses that as the window start when present
- Service types with `disallowStatutoryWithdrawal` still block post-provisioning withdrawal (no invented right)

## Notifications

| Event                             | Webhook                | Email                                                                                  |
| --------------------------------- | ---------------------- | -------------------------------------------------------------------------------------- |
| `service_plan.price_recalculated` | Yes                    | No                                                                                     |
| `subscription.price_changed`      | Yes (per subscription) | Yes — **one consolidated email per `userId`** per tenant run (`price-change` template) |

Email `correlationId` / event dedupe key: `price-recalc:{tenantId}:{userId}:{runDate}` (hashed to a UUID for `email_deliveries.event_id`).

Emails list subscription number, product name, old/new net, tax, and total (VAT from customer profile tax treatment), plus a disclaimer with the configured withdrawal day count.

## Job failure and retries

- Unit jobs: 3 attempts, exponential backoff 5s (shared queue defaults); failed jobs retained for Bull Board
- Within a tenant unit, each subscription is processed independently; one failure does not block others
- Ops: watch worker logs and Bull Board failed jobs (no separate DLQ/alerting product)

## Customer disclosure

Public and authenticated plan responses expose `autoRecalculatePriceDaily`. The billing console order modal and config-change modal show a disclaimer when the flag is true (email on change; then `withdrawalPolicy.periodDays` to withdraw without negative impact).

## Related code

- `ServicePlanPriceRecalcService`, `PriceRecalcJobHandler`
- `SubscriptionConfigChangeBillingService.applySettlement`
- Job names: `price-recalc.coordinator` / `price-recalc.unit`
