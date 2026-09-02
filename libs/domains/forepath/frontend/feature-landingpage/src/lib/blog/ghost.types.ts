export interface GhostAuthor {
  id: string;
  name: string;
  slug: string;
  profile_image: string | null;
  bio: string | null;
  url: string;
}

export interface GhostTag {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  feature_image: string | null;
  visibility: string;
  url: string;
}

export interface GhostPost {
  id: string;
  uuid: string;
  title: string;
  slug: string;
  html: string | null;
  feature_image: string | null;
  feature_image_alt: string | null;
  feature_image_caption: string | null;
  featured: boolean;
  visibility: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  custom_excerpt: string | null;
  excerpt: string | null;
  reading_time: number;
  canonical_url: string | null;
  url: string;
  og_image: string | null;
  og_title: string | null;
  og_description: string | null;
  twitter_image: string | null;
  twitter_title: string | null;
  twitter_description: string | null;
  meta_title: string | null;
  meta_description: string | null;
  authors?: GhostAuthor[];
  tags?: GhostTag[];
  primary_author?: GhostAuthor | null;
  primary_tag?: GhostTag | null;
}

export interface GhostPagination {
  page: number;
  limit: number | string;
  pages: number;
  total: number;
  next: number | null;
  prev: number | null;
}

export interface GhostPostsBrowseResult {
  posts: GhostPost[];
  meta: {
    pagination: GhostPagination;
  };
}

export interface BrowseGhostPostsParams {
  page?: number;
  limit?: number;
  query?: string;
}
