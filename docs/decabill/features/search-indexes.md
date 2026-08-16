# Search indexes (Decabill)

Decabill Manager uses **OpenSearch** for list and typeahead search across billing entities. Indexes are populated by:

1. **Live sync** on create/update/delete of searchable entities.
2. **Periodic BullMQ reindex** (`search-reindex.coordinator` / `.unit`) so upgrades from older versions fill indexes without manual steps.

Search queries always apply tenant/user authorization filters server-side. When OpenSearch is disabled or unreachable, list endpoints that previously used SQL `ILIKE` fall back to that path.

## Console list UX

Customer and admin console lists (subscriptions, projects, and related admin tables) use **infinite scroll**: the first page loads immediately; further pages append on scroll via `forepathInfiniteScroll` and `forepath-list-append-footer`. Append failures pause scrolling until the user retries. Lane boards use CDK virtual scroll for card rows.

Admin subscription search continues to hit the API (`search` query). Customer subscription and project search remain client-side over the pages already loaded when the list API has no `search` parameter.

## Configuration

See [environment configuration](../deployment/environment-configuration.md) and [system requirements](../deployment/system-requirements.md) for `OPENSEARCH_*` and sizing.

## Webhook events

- `search.reindex.started`
- `search.reindex.completed`
- `search.reindex.failed`
- `search.document.sync_failed`

Instance dependency health includes an `opensearch` field on updates/status profiles.
