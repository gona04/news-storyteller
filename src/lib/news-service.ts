import ABCNewsScraper from './scraper';
import CacheManager from './cache';
import cron from 'node-cron';
import type { ScrapedNewsData, NewsData, CacheInfo } from './types';

/**
 * News Service - Manages news scraping, caching, and scheduling
 */
class NewsService {
  private scraper: ABCNewsScraper;
  private cache: CacheManager;
  private isScrapingInProgress: boolean;
  private scheduledJobs: Array<{
    name: string;
    schedule: string;
    job: cron.ScheduledTask;
    startedAt: string;
  }>;

  constructor(options: {
    maxArticles?: number;
    timeout?: number;
    cacheMaxAge?: number;
    autoSchedule?: boolean;
  } = {}) {
    this.scraper = new ABCNewsScraper();
    this.cache = new CacheManager({
      maxAge: options.cacheMaxAge || 24 * 60 * 60 * 1000 // 24 hours
    });
    this.isScrapingInProgress = false;
    this.scheduledJobs = [];

    // Auto-start morning refresh scheduler
    if (options.autoSchedule !== false) {
      this.scheduleMorningRefresh();
    }
  }

  /**
   * Get latest news (from cache or fresh scrape)
   */
  async getLatestNews(options: { forceRefresh?: boolean; useCache?: boolean } = {}): Promise<ScrapedNewsData & { fromCache: boolean; cacheInfo?: CacheInfo; isStale?: boolean; error?: string; freshlyScraped?: boolean }> {
    const { forceRefresh = false, useCache = true } = options;

    try {
      // If force refresh or scraping in progress, wait for fresh data
      if (forceRefresh || this.isScrapingInProgress) {
        console.log('🔄 Force refresh requested or scraping in progress...');
        return await this.scrapeAndCache();
      }

      // Try to get from cache first
      if (useCache) {
        const cachedNews = await this.cache.getNews();
        if (cachedNews) {
          console.log('📰 Returning cached news data');
          return cachedNews;
        }
      }

      // Cache miss or expired - scrape fresh data
      console.log('📥 Cache miss - scraping fresh data...');
      return await this.scrapeAndCache();

    } catch (error) {
      console.error('❌ Error getting latest news:', error);

      // Try to return stale cache as fallback
      try {
        const staleCache = await this.cache.getNews(true); // Force get even if expired
        if (staleCache) {
          console.log('⚠️ Returning stale cache as fallback');
          return {
            ...staleCache,
            isStale: true,
            error: 'Fresh data unavailable, showing cached data'
          };
        }
      } catch (cacheError) {
        console.error('❌ Fallback cache also failed:', cacheError);
      }

      throw new Error(`Failed to get news: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Force refresh news data
   */
  async refreshNews(): Promise<ScrapedNewsData & { fromCache: boolean; freshlyScraped: boolean }> {
    console.log('🔄 Manual news refresh requested...');
    const result = await this.getLatestNews({ forceRefresh: true });
    return {
      ...result,
      freshlyScraped: result.freshlyScraped || false
    } as ScrapedNewsData & { fromCache: boolean; freshlyScraped: boolean };
  }

  /**
   * Get cache status and metadata
   */
  async getCacheInfo(): Promise<{
    cache: Awaited<ReturnType<CacheManager['getCacheStatus']>>;
    metadata: Awaited<ReturnType<CacheManager['getCacheMetadata']>>;
    scraping: {
      isInProgress: boolean;
      scheduledJobs: number;
    };
  } | { error: string }> {
    try {
      const status = await this.cache.getCacheStatus();
      const metadata = await this.cache.getCacheMetadata();

      return {
        cache: status,
        metadata: metadata,
        scraping: {
          isInProgress: this.isScrapingInProgress,
          scheduledJobs: this.scheduledJobs.length
        }
      };
    } catch (error) {
      console.error('❌ Error getting cache info:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Schedule morning refresh (6 AM daily)
   */
  scheduleMorningRefresh(): cron.ScheduledTask {
    console.log('⏰ Scheduling daily morning refresh at 6:00 AM...');

    // Schedule daily at 6 AM
    const morningJob = cron.schedule('0 6 * * *', async () => {
      console.log('🌅 Morning refresh triggered at 6:00 AM');
      try {
        await this.scrapeAndCache();
        console.log('✅ Morning refresh completed successfully');
      } catch (error) {
        console.error('❌ Morning refresh failed:', error);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata" // Adjust timezone as needed
    });

    this.scheduledJobs.push({
      name: 'morning-refresh',
      schedule: '0 6 * * *',
      job: morningJob,
      startedAt: new Date().toISOString()
    });

    console.log('✅ Morning refresh scheduled successfully');
    return morningJob;
  }

  /**
   * Schedule periodic refresh (every N hours)
   */
  schedulePeriodicRefresh(hours = 6): cron.ScheduledTask {
    console.log(`⏰ Scheduling periodic refresh every ${hours} hours...`);

    const periodicJob = cron.schedule(`0 */${hours} * * *`, async () => {
      console.log(`🔄 Periodic refresh triggered (every ${hours} hours)`);
      try {
        await this.scrapeAndCache();
        console.log('✅ Periodic refresh completed successfully');
      } catch (error) {
        console.error('❌ Periodic refresh failed:', error);
      }
    }, {
      scheduled: true
    });

    this.scheduledJobs.push({
      name: 'periodic-refresh',
      schedule: `0 */${hours} * * *`,
      job: periodicJob,
      startedAt: new Date().toISOString()
    });

    console.log(`✅ Periodic refresh scheduled successfully (every ${hours} hours)`);
    return periodicJob;
  }

  /**
   * Stop all scheduled jobs
   */
  stopScheduledJobs(): void {
    console.log('🛑 Stopping all scheduled jobs...');

    this.scheduledJobs.forEach(jobInfo => {
      jobInfo.job.stop();
      console.log(`⏹️ Stopped job: ${jobInfo.name}`);
    });

    this.scheduledJobs = [];
    console.log('✅ All scheduled jobs stopped');
  }

  /**
   * Get scheduled jobs info
   */
  getScheduledJobs(): Array<{
    name: string;
    schedule: string;
    startedAt: string;
    isRunning: boolean;
  }> {
    return this.scheduledJobs.map(jobInfo => ({
      name: jobInfo.name,
      schedule: jobInfo.schedule,
      startedAt: jobInfo.startedAt,
      isRunning: true // Assume running if not explicitly stopped
    }));
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<boolean> {
    console.log('🗑️ Clearing news cache...');
    return await this.cache.clearCache();
  }

  /**
   * Private method to scrape and cache news
   */
  private async scrapeAndCache(): Promise<ScrapedNewsData & { fromCache: boolean; freshlyScraped: boolean }> {
    if (this.isScrapingInProgress) {
      throw new Error('Scraping already in progress');
    }

    this.isScrapingInProgress = true;

    try {
      console.log('🔍 Starting news scraping process...');

      // Scrape fresh news
      const newsData = await this.scraper.scrapeLatestNews();

      // Store in cache
      await this.cache.storeNews(newsData);

      console.log('✅ News scraping and caching completed successfully');

      return {
        ...newsData,
        fromCache: false,
        freshlyScraped: true
      };

    } catch (error) {
      console.error('❌ Error in scrape and cache process:', error);
      throw error;
    } finally {
      this.isScrapingInProgress = false;
    }
  }

  /**
   * Get service statistics
   */
  getStats(): {
    isScrapingInProgress: boolean;
    scheduledJobsCount: number;
    scheduledJobs: Array<{
      name: string;
      schedule: string;
      startedAt: string;
      isRunning: boolean;
    }>;
    uptime: number;
    startedAt: string;
  } {
    return {
      isScrapingInProgress: this.isScrapingInProgress,
      scheduledJobsCount: this.scheduledJobs.length,
      scheduledJobs: this.getScheduledJobs(),
      uptime: process.uptime(),
      startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString()
    };
  }
}

export default NewsService;