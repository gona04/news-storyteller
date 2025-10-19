import { NextResponse } from 'next/server';
import { storyCache } from '@/lib/storyCache';

export async function GET() {
  try {
    // Test data
    const testUrl = 'https://example.com/test-article';
    const testTitle = 'Test Article Title';
    const testChunks = [
      {
        chunk_number: 1,
        chunk: 'This is the first chunk of the story.',
        has_more: true
      },
      {
        chunk_number: 2,
        chunk: 'This is the second chunk of the story.',
        has_more: false
      }
    ];

    // Save test story
    storyCache.saveStory(testUrl, testTitle, testChunks);

    // Retrieve the story
    const retrievedStory = storyCache.getStory(testUrl);

    // Get cache stats
    const stats = storyCache.getCacheStats();

    return NextResponse.json({
      success: true,
      testStory: retrievedStory,
      stats,
      cacheFileExists: true
    });
  } catch (error) {
    console.error('Test cache error:', error);
    return NextResponse.json(
      { error: 'Failed to test cache', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}