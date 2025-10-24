import axios from 'axios';
import * as cheerio from 'cheerio';
import type { NewsArticle } from './types';

/**
 * ABC News Scraper
 * Scrapes latest news headlines and articles from ABC News website
 */
class ABCNewsScraper {
  private baseUrl = 'https://abcnews.go.com';
  private timeout = 30000;
  private userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  private maxArticles = 500;  // Increased to get articles from all 9 categories (~50-80 per category)

  /**
   * Scrape latest news from ABC News homepage and category pages
   */
  async scrapeLatestNews(): Promise<{
    source: string;
    scrapedAt: string;
    totalArticles: number;
    articles: NewsArticle[];
  }> {
    try {
      console.log('🗞️ Scraping latest news from ABC News across multiple categories...');

      const articles: NewsArticle[] = [];

      // Category pages to scrape
      const categoryPages = [
        { url: this.baseUrl, name: 'General' },
        { url: `${this.baseUrl}/us`, name: 'US' },
        { url: `${this.baseUrl}/international`, name: 'International' },
        { url: `${this.baseUrl}/politics`, name: 'Politics' },
        { url: `${this.baseUrl}/business`, name: 'Business' },
        { url: `${this.baseUrl}/technology`, name: 'Technology' },
        { url: `${this.baseUrl}/sports`, name: 'Sports' },
        { url: `${this.baseUrl}/entertainment`, name: 'Entertainment' },
        { url: `${this.baseUrl}/health`, name: 'Health' }
      ];

      // Scrape each category page
      for (const page of categoryPages) {
        try {
          console.log(`📰 Scraping ${page.name}...`);
          const { data: html } = await axios.get(page.url, {
            timeout: this.timeout,
            headers: {
              'User-Agent': this.userAgent,
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Accept-Encoding': 'gzip, deflate',
              'Connection': 'keep-alive'
            }
          });

          const $ = cheerio.load(html);
          this.scrapeMainHeadlines($, articles, page.name);
          this.scrapeNewsLinks($, articles, page.name);
        } catch (categoryError) {
          console.warn(`⚠️ Failed to scrape ${page.name}:`, categoryError instanceof Error ? categoryError.message : 'Unknown error');
          // Continue to next category if one fails
        }
      }

      // Remove duplicates and limit results
      const uniqueArticles = this.removeDuplicates(articles);
      const limitedArticles = uniqueArticles.slice(0, this.maxArticles);

      console.log(`✅ Successfully scraped ${limitedArticles.length} articles from ABC News`);

      return {
        source: 'ABC News',
        scrapedAt: new Date().toISOString(),
        totalArticles: limitedArticles.length,
        articles: limitedArticles
      };

    } catch (error) {
      console.error('❌ Error scraping ABC News:', error);
      throw new Error(`Failed to scrape ABC News: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Scrape main headlines from main content area
   */
  private scrapeMainHeadlines($: cheerio.Root, articles: NewsArticle[], sourceCategory: string = 'General') {
    // Target article headlines - excluding navigation
    $('h1 a, h2 a, h3 a').each((_, element) => {
      const $element = $(element);
      const title = $element.text().trim();
      const relativeUrl = $element.attr('href');

      if (title && relativeUrl && title.length > 15 && this.isValidNewsUrl(relativeUrl) && this.isValidTitle(title)) {
        const fullUrl = this.buildFullUrl(relativeUrl);
        // Use sourceCategory from the page being scraped
        const category = sourceCategory;

        articles.push({
          id: this.generateId(title),
          title: this.cleanTitle(title),
          url: fullUrl,
          category,
          summary: '',
          imageUrl: '',
          publishedAt: new Date().toISOString(),
          scrapedAt: new Date().toISOString()
        });
      }
    });
  }

  /**
   * Scrape news links from main content area (excluding navigation)
   */
  private scrapeNewsLinks($: cheerio.Root, articles: NewsArticle[], sourceCategory: string = 'General') {
    // Focus on main content area and article containers - exclude nav
    const mainContent = $('main, [role="main"], .main-content, article, .article');
    
    if (mainContent.length > 0) {
      mainContent.find('a').each((_, element) => {
        this.processArticleLink($, element, articles, sourceCategory);
      });
    } else {
      // Fallback: scrape specific article patterns while avoiding navigation
      $('div[class*="story"] a, div[class*="article"] a, a[href*="/news/"], a[href*="/story"]').each((_, element) => {
        this.processArticleLink($, element, articles, sourceCategory);
      });
    }
  }

  /**
   * Check if URL is a valid news article URL (not navigation/menu)
   */
  private isValidNewsUrl(url: string): boolean {
    // Avoid common navigation/menu patterns
    if (!url) return false;
    
    const invalidPatterns = [
      '/alerts/',
      '/live-coverage/',
      '#',
      'javascript:',
      '/search',
      '/notify',
      '/about',
      '/contact',
      '/help',
      '/terms',
      '/privacy'
    ];

    for (const pattern of invalidPatterns) {
      if (url.includes(pattern)) {
        return false;
      }
    }

    // Valid news URL patterns
    const validPatterns = [
      '/news/',
      '/story/',
      '/wireStory/',
      '/us/',
      '/international/',
      '/politics/',
      '/business/',
      '/technology/',
      '/sports/',
      '/entertainment/',
      '/health/',
      '/GMA/',
      '/abc-news-live/'
    ];

    return validPatterns.some(pattern => url.includes(pattern));
  }

  /**
   * Check if title is valid news content (not meta/captions)
   */
  private isValidTitle(title: string): boolean {
    // Exclude specific known credit/publication names
    const excludedTitles = [
      'The Associated Press',
      'Associated Press',
      'Getty Images',
      'AP',
      'Reuters',
      'Bloomberg',
      'CNBC'
    ];

    if (excludedTitles.includes(title)) {
      return false;
    }

    // Exclude image credits and captions  
    const excludePatterns = [
      /^courtesy of/i,
      /^courtesy /i,
      /^credit:/i,
      /^photo:/i,
      /^image:/i,
      /^getty/i,
      /^associated press/i,
      /^ap photo/i,
      /^screenshot/i,
      /^composite/i,
      /^alt:/i,
      /^[a-z\s]*\/[a-z\s]*$/i,  // Pattern like "Sony Salzman/ABC News" or "Name/Publication"
      /^[A-Z][a-z]*\s[A-Z][a-z]*\/[A-Z]/  // "First Last/Publisher" pattern
    ];

    // Check length - skip very short titles that might be meta
    if (title.length < 20) {
      return false;
    }

    return !excludePatterns.some(pattern => pattern.test(title));
  }

  /**
   * Helper to process individual article links
   */
  private processArticleLink($: cheerio.Root, element: any, articles: NewsArticle[], sourceCategory: string): void {
    const $element = $(element);
    const title = $element.text().trim();
    const relativeUrl = $element.attr('href');

    if (title && relativeUrl && title.length > 15 && !articles.some(a => a.title === title) && this.isValidNewsUrl(relativeUrl) && this.isValidTitle(title)) {
      const fullUrl = this.buildFullUrl(relativeUrl);
      // Use sourceCategory from the page being scraped
      const category = sourceCategory;

      articles.push({
        id: this.generateId(title),
        title: this.cleanTitle(title),
        url: fullUrl,
        category,
        summary: '',
        imageUrl: '',
        publishedAt: new Date().toISOString(),
        scrapedAt: new Date().toISOString()
      });
    }
  }

  /**
   * Build full URL from relative URL
   */
  private buildFullUrl(relativeUrl: string): string {
    if (!relativeUrl) return '';
    if (relativeUrl.startsWith('http')) return relativeUrl;
    if (relativeUrl.startsWith('//')) return 'https:' + relativeUrl;
    if (relativeUrl.startsWith('/')) return this.baseUrl + relativeUrl;
    return this.baseUrl + '/' + relativeUrl;
  }

  /**
   * Extract category from URL
   */
  private extractCategoryFromUrl(url: string): string {
    if (!url) return 'General';

    const categoryMap: Record<string, string> = {
      '/us': 'National',
      '/international': 'International',
      '/politics': 'Politics',
      '/business': 'Business',
      '/technology': 'Technology',
      '/sports': 'Sports',
      '/entertainment': 'Entertainment',
      '/health': 'Health',
      '/science': 'Science',
      '/lifestyle': 'Lifestyle',
      '/world': 'International'
    };

    for (const [urlPattern, category] of Object.entries(categoryMap)) {
      if (url.includes(urlPattern)) {
        return category;
      }
    }

    return 'General';
  }

  /**
   * Clean article title
   */
  private cleanTitle(title: string): string {
    return title
      .replace(/\s+/g, ' ')
      .replace(/[""'']/g, '"')
      .replace(/…/g, '...')
      .trim();
  }

  /**
   * Generate unique ID for article
   */
  private generateId(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }

  /**
   * Remove duplicate articles based on title similarity, keeping the most specific category
   */
  private removeDuplicates(articles: NewsArticle[]): NewsArticle[] {
    const articleMap = new Map<string, NewsArticle>();
    
    for (const article of articles) {
      const normalizedTitle = article.title.toLowerCase().replace(/\s+/g, ' ');
      
      if (articleMap.has(normalizedTitle)) {
        const existing = articleMap.get(normalizedTitle)!;
        // Keep the article with the more specific category (not General)
        if (article.category !== 'General' && existing.category === 'General') {
          articleMap.set(normalizedTitle, article);
        }
      } else {
        articleMap.set(normalizedTitle, article);
      }
    }
    
    return Array.from(articleMap.values());
  }
}

export default ABCNewsScraper;