# shared-backend-util-opensearch

Shared NestJS OpenSearch client for Decabill Manager and Agenstra Controller.

## Usage

```ts
import { OpenSearchModule, OpenSearchService } from '@forepath/shared/backend/util-opensearch';

@Global() // OpenSearchModule is already @Global()
@Module({ imports: [OpenSearchModule] })
export class AppModule {}
```

Env: `OPENSEARCH_ENABLED`, `OPENSEARCH_NODE` / `OPENSEARCH_HOST`+`OPENSEARCH_PORT`, optional auth, `OPENSEARCH_INDEX_PREFIX`.

`OpenSearchService` provides `ping`, `ensureIndex`, `indexDocument`, `bulkUpsert`, `deleteDocument`, and scoped `search` (always apply authz filters via `filters`).
