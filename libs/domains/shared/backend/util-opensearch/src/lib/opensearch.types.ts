export interface OpenSearchDocument {
  id: string;
  [key: string]: unknown;
}

export interface OpenSearchBulkUpsertItem {
  id: string;
  document: Record<string, unknown>;
}

export interface OpenSearchSearchParams {
  index: string;
  query: string;
  fields: string[];
  filters?: Record<string, string | string[] | number | boolean | null | undefined>;
  from?: number;
  size?: number;
}

export interface OpenSearchSearchHit {
  id: string;
  score: number | null;
  source: Record<string, unknown>;
}

export interface OpenSearchSearchResult {
  hits: OpenSearchSearchHit[];
  total: number;
}

export const OPENSEARCH_MAX_QUERY_LENGTH = 256;
export const OPENSEARCH_MAX_PAGE_SIZE = 100;
export const OPENSEARCH_DEFAULT_PAGE_SIZE = 20;
