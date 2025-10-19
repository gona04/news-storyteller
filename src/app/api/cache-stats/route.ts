import { NextResponse } from 'next/server';
import { storyCache } from '@/lib/storyCache';

export async function GET() {
  try {
    const stats = storyCache.getCacheStats();

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cache stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get cache statistics' },
      { status: 500 }
    );
  }
}