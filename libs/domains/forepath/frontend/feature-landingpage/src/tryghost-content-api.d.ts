declare module '@tryghost/content-api' {
  interface GhostContentAPIOptions {
    url: string;
    key: string;
    version: string;
    host?: string;
    ghostPath?: string;
    userAgent?: string;
  }

  interface BrowseOptions {
    limit?: number | 'all';
    page?: number;
    order?: string;
    filter?: string;
    include?: string | string[];
    fields?: string | string[];
    formats?: string | string[];
  }

  interface ReadOptions {
    include?: string | string[];
    fields?: string | string[];
    formats?: string | string[];
  }

  interface GhostBrowseMeta {
    pagination: {
      page: number;
      limit: number | string;
      pages: number;
      total: number;
      next: number | null;
      prev: number | null;
    };
  }

  type GhostBrowseResult<T> = T[] & { meta: GhostBrowseMeta };

  interface GhostContentAPI {
    posts: {
      browse: (options?: BrowseOptions) => Promise<GhostBrowseResult<unknown>>;
      read: (data: { id?: string; slug?: string }, options?: ReadOptions) => Promise<unknown>;
    };
  }

  export default function GhostContentAPI(options: GhostContentAPIOptions): GhostContentAPI;
}
