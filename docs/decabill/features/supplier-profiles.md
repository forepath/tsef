# Supplier Profiles

Billing metadata for accounts-payable (AP) supplier invoices and DATEV creditor export. One profile per supplier per tenant.

## Overview

Supplier profiles store legal and contact information for inbound supplier invoices (expenses). They mirror [Customer profiles](./customer-profiles.md) structurally but are **admin-only** — there is no customer self-service surface.

On **first create**, the billing manager allocates a read-only **supplier number** (`SUP-######`) from the same `TENANTS_SHARED_NUMBERS` pool as customers and subscriptions. Updates never reallocate. See [Numbering](./numbering.md).

Profiles are managed through admin CRUD under `/admin/billing/supplier-profiles`.

## Admin Management

| Method | Path                                                          | Purpose                                     |
| ------ | ------------------------------------------------------------- | ------------------------------------------- |
| GET    | `/admin/billing/supplier-profiles`                            | Paginated list                              |
| GET    | `/admin/billing/supplier-profiles/{id}`                       | Full profile detail                         |
| POST   | `/admin/billing/supplier-profiles`                            | Create supplier                             |
| POST   | `/admin/billing/supplier-profiles/{id}`                       | Update profile fields                       |
| DELETE | `/admin/billing/supplier-profiles/{id}`                       | Delete (blocked when supplier has invoices) |
| POST   | `/admin/billing/supplier-profiles/{id}/vat-id/revalidate`     | Queue VIES VAT ID revalidation              |
| POST   | `/admin/billing/supplier-profiles/{id}/vat-id/mark-validated` | Admin override VAT validated status         |

**PAT scope:** `supplier_profile:admin` (class-level on the controller).

Admin profile **detail** also returns:

- `numberScope` — the pool key used when the supplier number was allocated
- `datevCreditorNumber` — nullable DATEV creditor account number when one already exists (lazy allocation on DATEV export; not writable from this UI)

Neither field is writable.

## Custom Data (Admin Only)

Operators can attach arbitrary string key/value pairs for integrations (ERP ids, vendor codes, and similar).

| Method | Path                                               | Purpose                                 |
| ------ | -------------------------------------------------- | --------------------------------------- |
| POST   | `/admin/billing/supplier-profiles/{id}/data`       | Add a key (409 if it already exists)    |
| POST   | `/admin/billing/supplier-profiles/{id}/data/{key}` | Update an existing key (404 if missing) |
| DELETE | `/admin/billing/supplier-profiles/{id}/data/{key}` | Delete an existing key (404 if missing) |

Storage: `custom_data` column on `billing_supplier_profiles`, encrypted at rest with AES-256-GCM (`ENCRYPTION_KEY`).

Webhook events (values never included): `supplier_profile.custom_data_added`, `supplier_profile.custom_data_updated`, `supplier_profile.custom_data_deleted`. See [Webhooks](./webhooks.md).

## Supplier Contracts

Optional contract numbers link supplier invoices to recurring or project-specific agreements.

| Method | Path                                                                    | Purpose                           |
| ------ | ----------------------------------------------------------------------- | --------------------------------- |
| GET    | `/admin/billing/supplier-profiles/{supplierId}/contracts`               | Search contracts (`search` query) |
| POST   | `/admin/billing/supplier-profiles/{supplierId}/contracts/get-or-create` | Get or create by `contractNumber` |

Contract endpoints live on the supplier-invoices admin controller but require `supplier_profile:admin`.

## DATEV Creditor Accounts

Creditor numbers are allocated lazily during monthly DATEV export (same pattern as customer debtor accounts). Range configuration uses `BILLING_DATEV_CREDITOR_ACCOUNT_START` / `BILLING_DATEV_CREDITOR_ACCOUNT_END`. See [Environment configuration](../deployment/environment-configuration.md) and [Numbering](./numbering.md).

When the creditor range is exhausted, the export emits webhook `datev.creditor_range_exhausted`. When a new creditor is assigned, `supplier_creditor.allocated` fires.

## Webhook Events

- `supplier_profile.created`, `supplier_profile.updated`, `supplier_profile.deleted`
- `supplier_profile.custom_data_*` (key only; no values)

Payloads include `profileId` and `supplierNumber` where applicable; no address or VAT PII beyond identifiers.

## Related

- [Supplier invoices](./supplier-invoices.md)
- [Billing Administration](./billing-administration.md)
- [VAT and tax treatment](./vat-and-tax-treatment.md)
- [Numbering](./numbering.md)
