# Container Manager

First-party Decabill addon module that surfaces Docker host insights (containers, resource usage, overlay networking) on the [service details](./service-details.md) page for integrated (Docker-host) stacks.

## Overview

| Aspect       | Detail                                                                  |
| ------------ | ----------------------------------------------------------------------- |
| Catalog key  | `container-manager`                                                     |
| Module key   | `container-manager`                                                     |
| Type         | `module` (builtin; also loadable via `DYNAMIC_ADDON_MODULES`)           |
| Service tab  | `id: container-manager`, label `Container Manager`, `order: 100`        |
| Provisioning | `provision` / `teardown` are no-ops (Docker already on integrated host) |
| Pricing      | Catalog seed uses free monthly base price (`0`) by default              |

Plans with integrated provisioning auto-attach Container Manager as **allowed and mandatory**. See [Addons — Plan linkage](./addons.md#plan-linkage).

## REST API

Requires an **active** subscription addon with `moduleKey: container-manager`, plus a reachable public IP and item SSH private key.

| Audience | Method | Path                                                                                                      | Scope                |
| -------- | ------ | --------------------------------------------------------------------------------------------------------- | -------------------- |
| Customer | GET    | `/subscriptions/{subscriptionId}/items/{itemId}/container-manager/containers`                             | `subscriptions:read` |
| Customer | GET    | `/subscriptions/{subscriptionId}/items/{itemId}/container-manager/containers/{containerId}/stats-history` | `subscriptions:read` |
| Customer | GET    | `/subscriptions/{subscriptionId}/items/{itemId}/container-manager/containers/{containerId}/logs`          | `subscriptions:read` |
| Customer | GET    | `/subscriptions/{subscriptionId}/items/{itemId}/container-manager/networks`                               | `subscriptions:read` |
| Admin    | GET    | `/admin/billing/subscriptions/{subscriptionId}/items/{itemId}/container-manager/...` (same suffixes)      | `billing_admin:read` |

Response shapes match OpenAPI `ContainerManagerContainersResponse`, `ContainerManagerStatsHistoryResponse`, `ContainerManagerLogsResponse`, and `ContainerManagerNetworksResponse`.

Item detail may embed a lightweight `containerManager` summary (`containerCount`, `healthyCount`, `lastCollectedAt`) from the last successful collection cache.

## SSH collection

Collection runs as `root` on port 22 using the provisioning SSH key and the item’s cached public IP:

1. Wait until the host is reachable
2. Run read-only Docker CLI (`docker ps`, `docker stats --no-stream`, `docker logs --timestamps --tail`, `docker network ls` / `inspect`)
3. Parse NDJSON / JSON / log text into DTOs; keep a short in-memory stats history (capped) for charts; cap log payload size for the UI
4. On failure, return a generic client error and publish `addon.container_manager.collection_failed`

No mutating Docker commands are issued. Script output and private keys are never included in webhook payloads or customer-facing messages.

The Container Manager tab loads logs when a container is selected and refreshes them on a short REST poll interval (logstream-style without a dedicated websocket).

## Security

- Customer routes require subscription ownership; missing ownership returns 404 (no existence leak)
- Access requires the same live subscription statuses as service details (`active`, `pending_cancel`, `pending_config_change`, `pending_backorder`) and an active provisioned item
- Admin routes require ADMIN + `billing_admin:read`; ownership is not required
- Endpoints 404 when Container Manager is not active on the subscription
- Collection failures use a generic message (`Unable to collect container information`); details stay in server logs only
- SSH private keys remain server-side; Container Manager responses never include them
- SSH targets must be literal IPv4/IPv6 from the server-info snapshot; docker network names are single-quote escaped and reject null/newline bytes; stats-history container IDs must be hex docker IDs

## Realtime

Primary delivery is **REST polling** from the Container Manager tab. AsyncAPI documents an optional future push event `billing/containerManagerUpdate` for room `subscription:{id}:container-manager` aligned with the containers summary. Until the gateway emits it, clients should keep polling REST.

## Notifications

| Event                                       | Channel            | When                                     |
| ------------------------------------------- | ------------------ | ---------------------------------------- |
| `addon.container_manager.collection_failed` | Webhook (no email) | SSH/Docker collection failed for an item |

Payload includes subscription/plan/addon identifiers, `itemId`, and a generic `errorMessage`. Config snapshots and secrets are never included. See [Webhooks](./webhooks.md).

## Related

- [Addons](./addons.md)
- [Service details](./service-details.md)
- [Server provisioning](./server-provisioning.md)
