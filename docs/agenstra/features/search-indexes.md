# Search indexes (Agenstra)

Agenstra Controller uses **OpenSearch** for list and typeahead search across workspaces, tickets, knowledge, rules, audit statistics, and related entities. Indexes are populated by live mutation sync and periodic BullMQ reindex jobs (`search-reindex.coordinator` / `.unit`).

Search queries always scope by authenticated client/workspace access. When OpenSearch is unavailable, statistics endpoints that previously used SQL `ILIKE` fall back to that path.

## Console list UX

Agent console lists (workspaces/clients, environments/agents, filter rules) use **infinite scroll**: first page on entry, then append on scroll with `sharedInfiniteScroll` and `shared-list-append-footer`. Append errors pause loading until retry. Ticket board lane cards use CDK virtual scroll.

Audit (and other API-backed search surfaces) keep server-side `search`; local filters on already-loaded pages stay client-side where the list endpoint has no search param.

## Configuration

See [environment configuration](../deployment/environment-configuration.md) and [system requirements](../deployment/system-requirements.md).

## Webhook events

- `search.reindex.started`
- `search.reindex.completed`
- `search.reindex.failed`
- `search.document.sync_failed`

Instance dependency health includes an `opensearch` field on updates/status profiles.
