import fs from 'fs-extra';
import path from 'path';
import type { ScrapedNewsData, NewsData, CacheInfo } from './types';

/**
 * Cache Manager for storing and retrieving scraped news data
 */
class CacheManager {
  private cacheDir: string;
  private cacheFile: string;
  private metadataFile: string;
  private maxAge: number;

  constructor(options: { cacheDir?: string; maxAge?: number } = {}) {
    this.cacheDir = options.cacheDir || path.join(process.cwd(), 'cache');
    this.cacheFile = path.join(this.cacheDir, 'news-cache.json');
    this.metadataFile = path.join(this.cacheDir, 'cache-metadata.json');
    this.maxAge = options.maxAge || 24 * 60 * 60 * 1000; // 24 hours

    // Ensure cache directory exists
    this.ensureCacheDir();
  }

  /**
   * Store news data in cache
   */
  async storeNews(newsData: ScrapedNewsData): Promise<boolean> {
    try {
      console.log('💾 Storing news data in cache...');

      const cacheData = {
        lastUpdated: new Date().toISOString(),
        source: newsData.source,
        totalArticles: newsData.totalArticles,
        articles: newsData.articles,
        scrapedAt: newsData.scrapedAt
      };

      const metadata = {
        lastRefresh: new Date().toISOString(),
        nextScheduledRefresh: this.getNextMorningRefresh(),
        totalArticlesCached: newsData.totalArticles,
        cacheSize: JSON.stringify(cacheData).length
      };

      // Write cache data
      await fs.writeJson(this.cacheFile, cacheData, { spaces: 2 });
      await fs.writeJson(this.metadataFile, metadata, { spaces: 2 });

      console.log(`✅ Cached ${newsData.totalArticles} articles successfully`);
      return true;

    } catch (error) {
      console.error('❌ Error storing cache:', error);
      throw new Error(`Failed to store cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve news data from cache
   */
  async getNews(forceRefresh = false): Promise<(ScrapedNewsData & { fromCache: boolean; cacheInfo: CacheInfo }) | null> {
    try {
      // Check if cache exists
      if (!await fs.pathExists(this.cacheFile)) {
        console.log('📭 No cache found');
        return null;
      }

      // Check if cache is expired
      if (!forceRefresh && await this.isCacheExpired()) {
        console.log('⏰ Cache expired');
        return null;
      }

      console.log('📰 Retrieving news from cache...');
      const cacheData = await fs.readJson(this.cacheFile);
      
      // Add cache info to response
      const metadata = await this.getCacheMetadata();
      
      return {
        source: cacheData.source,
        scrapedAt: cacheData.scrapedAt,
        totalArticles: cacheData.totalArticles,
        articles: cacheData.articles,
        fromCache: true,
        cacheInfo: {
          lastUpdated: cacheData.lastUpdated,
          nextRefresh: metadata?.nextScheduledRefresh || null,
          articlesCount: cacheData.totalArticles
        }
      };    } catch (error) {
      console.error('❌ Error reading cache:', error);
      return null;
    }
  }

  /**
   * Get cache metadata
   */
  async getCacheMetadata(): Promise<{
    lastRefresh: string | null;
    nextScheduledRefresh: string | null;
    totalArticlesCached: number;
    cacheSize: number;
  } | null> {
    try {
      if (!await fs.pathExists(this.metadataFile)) {
        return {
          lastRefresh: null,
          nextScheduledRefresh: null,
          totalArticlesCached: 0,
          cacheSize: 0
        };
      }

      return await fs.readJson(this.metadataFile);
    } catch (error) {
      console.error('❌ Error reading metadata:', error);
      return null;
    }
  }

  /**
   * Check if cache is expired
   */
  private async isCacheExpired(): Promise<boolean> {
    try {
      const stats = await fs.stat(this.cacheFile);
      const cacheAge = Date.now() - new Date(stats.mtime).getTime();
      return cacheAge > this.maxAge;
    } catch (error) {
      return true; // Consider expired if can't read
    }
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<boolean> {
    try {
      console.log('🗑️ Clearing cache...');

      if (await fs.pathExists(this.cacheFile)) {
        await fs.remove(this.cacheFile);
      }

      if (await fs.pathExists(this.metadataFile)) {
        await fs.remove(this.metadataFile);
      }

      console.log('✅ Cache cleared successfully');
      return true;
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
      return false;
    }
  }

  /**
   * Get cache status
   */
  async getCacheStatus(): Promise<{
    exists: boolean;
    lastUpdated: string | null;
    isExpired: boolean;
    size: number;
    articlesCount: number;
    nextRefresh: string | null;
    error?: string;
  }> {
    try {
      const cacheExists = await fs.pathExists(this.cacheFile);

      if (!cacheExists) {
        return {
          exists: false,
          lastUpdated: null,
          isExpired: true,
          size: 0,
          articlesCount: 0,
          nextRefresh: null
        };
      }

      const stats = await fs.stat(this.cacheFile);
      const cacheData = await fs.readJson(this.cacheFile);
      const isExpired = await this.isCacheExpired();
      const metadata = await this.getCacheMetadata();

      return {
        exists: true,
        lastUpdated: cacheData.lastUpdated,
        isExpired: isExpired,
        size: stats.size,
        articlesCount: cacheData.totalArticles,
        nextRefresh: metadata?.nextScheduledRefresh || null
      };

    } catch (error) {
      console.error('❌ Error getting cache status:', error);
      return {
        exists: false,
        lastUpdated: null,
        isExpired: true,
        size: 0,
        articlesCount: 0,
        nextRefresh: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Calculate next morning refresh time (6 AM)
   */
  private getNextMorningRefresh(): string {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(6, 0, 0, 0); // 6 AM tomorrow

    return tomorrow.toISOString();
  }

  /**
   * Ensure cache directory exists
   */
  private ensureCacheDir(): void {
    fs.ensureDirSync(this.cacheDir);
  }

  /**
   * Get cache file paths (for debugging)
   */
  getCachePaths(): {
    cacheDir: string;
    cacheFile: string;
    metadataFile: string;
  } {
    return {
      cacheDir: this.cacheDir,
      cacheFile: this.cacheFile,
      metadataFile: this.metadataFile
    };
  }
}

export default CacheManager;