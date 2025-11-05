import { NextRequest, NextResponse } from "next/server";
import { initializeCrew } from "@/lib/ai-agents";
import { scrapeArticle } from "@/lib/article-scraper";
import fs from "fs";
import path from "path";

// Cache directory for storing narration results
const CACHE_DIR = path.join(process.cwd(), "cache", "ai-narrator");

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Generate a cache key from the news link and article content
function getCacheKey(newsLink: string, articleContent?: string): string {
  // Create a hash from both URL and content preview
  const contentPreview = articleContent ? articleContent.substring(0, 500) : '';
  const combined = `${newsLink}|${contentPreview}`;

  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `narration_${Math.abs(hash)}.json`;
}

// Get cached narration if it exists
function getCachedNarration(newsLink: string): {
  success: boolean;
  data?: any;
} {
  try {
    const cacheKey = getCacheKey(newsLink);
    const cachePath = path.join(CACHE_DIR, cacheKey);

    if (fs.existsSync(cachePath)) {
      const cachedData = fs.readFileSync(cachePath, "utf-8");
      return {
        success: true,
        data: JSON.parse(cachedData),
      };
    }
  } catch (error) {
    console.error("Error reading cache:", error);
  }

  return { success: false };
}

// Save narration to cache with specific key
function saveToCacheWithKey(cacheKey: string, data: any): { success: boolean; error?: string } {
  try {
    const cachePath = path.join(CACHE_DIR, cacheKey);

    fs.writeFileSync(cachePath, JSON.stringify(data, null, 2));
    return { success: true };
  } catch (error) {
    console.error("Error saving to cache:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { news_link } = await request.json();

    if (!news_link) {
      return NextResponse.json(
        {
          success: false,
          details: "news_link is required",
        },
        { status: 400 }
      );
    }

    // Check if we have a cached version
    const cachedResult = getCachedNarration(news_link);
    if (cachedResult.success && cachedResult.data) {
      console.log("🎯 Returning cached narration");
      return NextResponse.json({
        ...cachedResult.data,
        cached: true,
      });
    }

    console.log("🚀 Starting AI narration for:", news_link);

    // First, scrape the article content
    console.log("📄 Scraping article content...");
    const articleData = await scrapeArticle(news_link);

    if (!articleData.success || !articleData.content) {
      return NextResponse.json({
        success: false,
        details: "Failed to scrape article content. The article may be behind a paywall or unavailable.",
        error: articleData.error
      }, { status: 400 });
    }

    console.log(`📝 Article scraped: "${articleData.title}" (${articleData.content.length} chars)`);

    // Initialize AI agents with the actual article content
    const { crew } = initializeCrew(news_link, articleData.content, articleData.title);

    // Execute the crew
    const tolstoyNarration = await crew.kickoff();

    // Extract title from scraped article or use a default
    const urlObj = new URL(news_link);
    const title = articleData.title || urlObj.hostname.split(".")[0] || "News Article";

    const result = {
      success: true,
      news_link,
      title: `${title} - Roald Dahl's Narrative`,
      roald_dahl_narration: tolstoyNarration,
      article_content: articleData.content.substring(0, 1000) + (articleData.content.length > 1000 ? '...' : ''), // Include preview of article content
      timestamp: new Date().toISOString(),
    };

    // Save to cache with content-based key
    const cacheKey = getCacheKey(news_link, articleData.content);
    saveToCacheWithKey(cacheKey, result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in ai-narrator API:", error);
    return NextResponse.json(
      {
        success: false,
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const news_link = searchParams.get("news_link");

    if (!news_link) {
      return NextResponse.json(
        {
          success: false,
          details: "news_link query parameter is required",
        },
        { status: 400 }
      );
    }

    // Try to get from cache
    const cachedResult = getCachedNarration(news_link);
    if (cachedResult.success && cachedResult.data) {
      return NextResponse.json({
        ...cachedResult.data,
        cached: true,
      });
    }

    return NextResponse.json(
      {
        success: false,
        details: "Narration not found in cache. Please use POST to generate.",
      },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error in ai-narrator GET:", error);
    return NextResponse.json(
      {
        success: false,
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
