import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ScrapedArticle {
  title: string;
  content: string;
  url: string;
  success: boolean;
  error?: string;
}

/**
 * Scrape article content from a news URL
 */
export async function scrapeArticle(url: string): Promise<ScrapedArticle> {
  try {
    console.log(`🔍 Scraping article from: ${url}`);

    // Set a reasonable timeout and user agent
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    });

    const $ = cheerio.load(response.data);

    // Try to extract title - ABC News specific selectors first
    let title = '';
    const titleSelectors = [
      'h1[data-testid="headline"]', // ABC News specific
      'h1.article-title',
      'h1.entry-title',
      '.article-title',
      '.entry-title',
      'h1',
      'title'
    ];

    for (const selector of titleSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        title = element.text().trim();
        if (title && title.length > 10) break; // Ensure we have a substantial title
      }
    }

    // If no title found, try document title
    if (!title) {
      title = $('title').text().trim() || 'News Article';
    }

    // Remove unwanted elements that clutter the content
    $('script, style, nav, header, footer, aside, .ad, .advertisement, .sidebar, .related-content, .social-share, .comments, .newsletter-signup, .video-player, .gallery, .photo-gallery').remove();

    // ABC News specific content selectors
    let content = '';
    const contentSelectors = [
      '[data-testid="prism-body"]', // ABC News article body
      '[data-module="ArticleBody"]',
      '.article-body',
      '.story-body',
      '.entry-content',
      '.post-content',
      '.article-content',
      '.content-body',
      'article',
      '.main-content',
      '.article__body'
    ];

    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        // Get text content and clean it up
        content = element.text().trim();
        if (content && content.length > 200) { // Ensure we have substantial content
          console.log(`📝 Found content using selector: ${selector} (${content.length} chars)`);
          break;
        }
      }
    }

    // If no specific content found, try to get all paragraph text from main content areas
    if (!content || content.length < 200) {
      console.log('🔄 Trying fallback content extraction...');
      const mainContentAreas = $('main, .main, #main, .content, #content, .story, .article').first();
      if (mainContentAreas.length > 0) {
        const paragraphs = mainContentAreas.find('p').map((i, el) => $(el).text().trim()).get();
        content = paragraphs.join('\n\n').trim();
      }
    }

    // Last resort: get all paragraph text from the entire page
    if (!content || content.length < 100) {
      console.log('🔄 Using all paragraphs as fallback...');
      const paragraphs = $('p').map((i, el) => $(el).text().trim()).get()
        .filter(p => p.length > 20) // Filter out very short paragraphs
        .filter(p => !p.includes('@') && !p.includes('http') && !p.includes('Copyright')); // Filter out footers/emails
      content = paragraphs.join('\n\n').trim();
    }

    // Clean up the content
    content = content
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, '\n\n') // Clean up line breaks
      .replace(/[^\x20-\x7E\n]/g, '') // Remove non-ASCII characters except newlines
      .trim();

    // Limit content length to avoid token limits
    if (content.length > 4000) {
      content = content.substring(0, 4000) + '...';
    }

    console.log(`✅ Successfully scraped article: "${title.substring(0, 50)}..." (${content.length} characters)`);
    console.log(`📄 Content preview: "${content.substring(0, 100)}..."`);

    return {
      title,
      content,
      url,
      success: true
    };

  } catch (error) {
    console.error(`❌ Failed to scrape article from ${url}:`, error);

    return {
      title: 'News Article',
      content: `Unable to fetch article content from ${url}. The article may be behind a paywall, require JavaScript, or the website structure may have changed.`,
      url,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Extract the main content from HTML using common news site patterns
 */
export function extractArticleContent(html: string, url: string): string {
  const $ = cheerio.load(html);

  // Remove unwanted elements
  $('script, style, nav, header, footer, aside, .ad, .advertisement, .sidebar').remove();

  // Try to find article content
  const selectors = [
    'article',
    '.article-content',
    '.entry-content',
    '.post-content',
    '.story-body',
    '.article-body',
    '[data-component="ArticleBody"]',
    '.article__body',
    '.content-body',
    '.main-content'
  ];

  for (const selector of selectors) {
    const content = $(selector).text().trim();
    if (content && content.length > 200) {
      return content;
    }
  }

  // Fallback: get all paragraph text
  const paragraphs = $('p').map((i, el) => $(el).text().trim()).get();
  return paragraphs.join('\n\n').trim();
}