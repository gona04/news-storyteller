import axios from 'axios';
import * as cheerio from 'cheerio';
import type { NewsArticle } from './types';

/**
 * The Hindu News Scraper
 * Scrapes latest news headlines and articles from The Hindu website
 */
class HinduScraper {
  private baseUrl = 'https://www.thehindu.com';
  private timeout = 30000;
  private userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  private maxArticles = 50;

  /**
   * Scrape latest news from The Hindu homepage
   */
  async scrapeLatestNews(): Promise<{
    source: string;
    scrapedAt: string;
    totalArticles: number;
    articles: NewsArticle[];
  }> {
    try {
      console.log('🗞️ Scraping latest news from The Hindu...');

      const { data: html } = await axios.get(this.baseUrl, {
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
      const articles: NewsArticle[] = [];

      // Scrape from main news sections
      this.scrapeMainHeadlines($, articles);
      this.scrapeLatestNewsSection($, articles);
      this.scrapeSectionNews($, articles);

      // Remove duplicates and limit results
      const uniqueArticles = this.removeDuplicates(articles);
      const limitedArticles = uniqueArticles.slice(0, this.maxArticles);

      console.log(`✅ Successfully scraped ${limitedArticles.length} articles from The Hindu`);

      return {
        source: 'The Hindu',
        scrapedAt: new Date().toISOString(),
        totalArticles: limitedArticles.length,
        articles: limitedArticles
      };

    } catch (error) {
      console.error('❌ Error scraping The Hindu:', error);
      throw new Error(`Failed to scrape The Hindu: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Scrape main headlines from homepage
   */
  private scrapeMainHeadlines($: cheerio.Root, articles: NewsArticle[]) {
    $('h1 a, h2 a, h3 a').each((_, element) => {
      const $element = $(element);
      const title = $element.text().trim();
      const relativeUrl = $element.attr('href');

      if (title && relativeUrl && title.length > 20) {
        const fullUrl = this.buildFullUrl(relativeUrl);
        const category = this.extractCategoryFromUrl(relativeUrl);

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
   * Scrape from latest news section
   */
  private scrapeLatestNewsSection($: cheerio.Root, articles: NewsArticle[]) {
    $('div[data-ga-label="Latest News"] ul.timeline li').each((_, element) => {
      const $element = $(element);
      const $link = $element.find('a');
      const title = $link.text().trim();
      const relativeUrl = $link.attr('href');
      const timeElement = $element.find('.timePublished');
      const publishedTime = timeElement.attr('data-published') || '';

      if (title && relativeUrl && title.length > 15) {
        const fullUrl = this.buildFullUrl(relativeUrl);
        const category = this.extractCategoryFromUrl(relativeUrl);

        articles.push({
          id: this.generateId(title),
          title: this.cleanTitle(title),
          url: fullUrl,
          category,
          summary: '',
          imageUrl: '',
          publishedAt: publishedTime || new Date().toISOString(),
          scrapedAt: new Date().toISOString()
        });
      }
    });
  }

  /**
   * Scrape from different news sections
   */
  private scrapeSectionNews($: cheerio.Root, articles: NewsArticle[]) {
    $('.story-card, .story-card120, .story-card300').each((_, element) => {
      const $element = $(element);
      const $link = $element.find('a');
      const title = $link.find('h3, h2, h1').text().trim() || $link.text().trim();
      const relativeUrl = $link.attr('href');
      const $img = $element.find('img');
      const imageUrl = $img.attr('src') || '';

      if (title && relativeUrl && title.length > 15) {
        const fullUrl = this.buildFullUrl(relativeUrl);
        const category = this.extractCategoryFromUrl(relativeUrl);

        articles.push({
          id: this.generateId(title),
          title: this.cleanTitle(title),
          url: fullUrl,
          category,
          summary: '',
          imageUrl: imageUrl ? this.buildFullUrl(imageUrl) : '',
          publishedAt: new Date().toISOString(),
          scrapedAt: new Date().toISOString()
        });
      }
    });
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
      'news/national': 'National',
      'news/international': 'International',
      'news/cities': 'Cities',
      'sport': 'Sports',
      'business': 'Business',
      'opinion': 'Opinion',
      'entertainment': 'Entertainment',
      'sci-tech': 'Technology',
      'society': 'Society',
      'education': 'Education',
      'health': 'Health'
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
   * Remove duplicate articles based on title similarity
   */
  private removeDuplicates(articles: NewsArticle[]): NewsArticle[] {
    const seen = new Set<string>();
    return articles.filter(article => {
      const normalizedTitle = article.title.toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(normalizedTitle)) {
        return false;
      }
      seen.add(normalizedTitle);
      return true;
    });
  }
}

export default HinduScraper;