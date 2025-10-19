export interface NewsArticle {
  id: string;
  title: string;
  url: string;
  category: string;
  summary?: string;
  imageUrl?: string;
  publishedAt: string;
  scrapedAt: string;
}

export interface ScrapedNewsData {
  source: string;
  scrapedAt: string;
  totalArticles: number;
  articles: NewsArticle[];
}

export interface NewsData {
  success: boolean;
  data: {
    lastUpdated: string;
    source: string;
    totalArticles: number;
    articles: NewsArticle[];
    fromCache?: boolean;
    scrapedAt: string;
    cacheInfo?: CacheInfo;
    isStale?: boolean;
    error?: string;
  };
  timestamp: string;
}

export interface CacheInfo {
  lastUpdated: string;
  nextRefresh: string | null;
  articlesCount: number;
}

export type Category = 'All' | 'National' | 'International' | 'Business' | 'Cities' | 'Technology' | 'Sports' | 'General';