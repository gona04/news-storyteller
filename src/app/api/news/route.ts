import { NextRequest, NextResponse } from 'next/server';
import NewsService from '@/lib/news-service';

// Initialize news service with auto-scheduling
const newsService = new NewsService();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';
    const category = searchParams.get('category');

    console.log(`📰 API Request: forceRefresh=${forceRefresh}, category=${category}`);

    // Get latest news
    const newsData = await newsService.getLatestNews({ forceRefresh });

    // Filter by category if specified
    let filteredArticles = newsData.articles;
    if (category && category !== 'All') {
      filteredArticles = newsData.articles.filter(article =>
        article.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Format response
    const response = {
      success: true,
      data: {
        lastUpdated: newsData.scrapedAt,
        source: newsData.source,
        totalArticles: filteredArticles.length,
        articles: filteredArticles,
        fromCache: newsData.fromCache,
        scrapedAt: newsData.scrapedAt,
        ...(newsData.cacheInfo && { cacheInfo: newsData.cacheInfo }),
        ...(newsData.isStale && { isStale: newsData.isStale }),
        ...(newsData.error && { error: newsData.error })
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ API Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    console.log(`🔄 API POST Request: action=${action}`);

    switch (action) {
      case 'refresh':
        const refreshedData = await newsService.refreshNews();
        return NextResponse.json({
          success: true,
          message: 'News refreshed successfully',
          data: refreshedData,
          timestamp: new Date().toISOString()
        });

      case 'clear-cache':
        const cleared = await newsService.clearCache();
        return NextResponse.json({
          success: cleared,
          message: cleared ? 'Cache cleared successfully' : 'Failed to clear cache',
          timestamp: new Date().toISOString()
        });

      case 'cache-info':
        const cacheInfo = await newsService.getCacheInfo();
        return NextResponse.json({
          success: true,
          data: cacheInfo,
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action. Supported actions: refresh, clear-cache, cache-info',
            timestamp: new Date().toISOString()
          },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('❌ API POST Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}