import {
  OPENSEARCH_DEFAULT_PAGE_SIZE,
  OPENSEARCH_MAX_PAGE_SIZE,
  OPENSEARCH_MAX_QUERY_LENGTH,
} from './opensearch.types';

export function sanitizeSearchQuery(raw: string | undefined | null): string {
  if (!raw) {
    return '';
  }

  const trimmed = raw.trim().slice(0, OPENSEARCH_MAX_QUERY_LENGTH);

  // Escape reserved simple_query_string operators while keeping usable text search.
  return trimmed.replace(/[+\-=&|><!(){}[\]^"~*?:\\/]/g, '\\$&');
}

export function clampSearchPagination(limit?: number, offset?: number): { size: number; from: number } {
  const sizeRaw = limit ?? OPENSEARCH_DEFAULT_PAGE_SIZE;
  const fromRaw = offset ?? 0;
  const size = Math.min(
    OPENSEARCH_MAX_PAGE_SIZE,
    Math.max(1, Number.isFinite(sizeRaw) ? Math.trunc(sizeRaw) : OPENSEARCH_DEFAULT_PAGE_SIZE),
  );
  const from = Math.max(0, Number.isFinite(fromRaw) ? Math.trunc(fromRaw) : 0);

  return { size, from };
}

export function buildScopedSearchBody(params: {
  query: string;
  fields: string[];
  filters?: Record<string, string | string[] | number | boolean | null | undefined>;
  from: number;
  size: number;
}): Record<string, unknown> {
  const filterClauses: Record<string, unknown>[] = [];

  for (const [field, value] of Object.entries(params.filters ?? {})) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        continue;
      }

      filterClauses.push({ terms: { [field]: value } });
      continue;
    }

    filterClauses.push({ term: { [field]: value } });
  }

  const must: Record<string, unknown>[] = [];
  const sanitized = sanitizeSearchQuery(params.query);

  if (sanitized) {
    must.push({
      simple_query_string: {
        query: sanitized,
        fields: params.fields.length > 0 ? params.fields : ['*'],
        default_operator: 'and',
        lenient: true,
      },
    });
  } else {
    must.push({ match_all: {} });
  }

  return {
    from: params.from,
    size: params.size,
    track_total_hits: true,
    query: {
      bool: {
        must,
        filter: filterClauses,
      },
    },
  };
}
