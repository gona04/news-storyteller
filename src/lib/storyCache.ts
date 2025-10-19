import fs from 'fs';
import path from 'path';

interface StoryChunk {
  chunk_number: number;
  chunk: string;
  has_more: boolean;
}

interface CachedStory {
  title: string;
  story_chunks: StoryChunk[];
  created_at: string;
  last_accessed: string;
}

interface StoryCache {
  stories: Record<string, CachedStory>;
}

const CACHE_FILE = path.join(process.cwd(), 'cached_stories.json');
const CACHE_EXPIRY_DAYS = 30; // Cache stories for 30 days

class StoryCacheManager {
  private cache: StoryCache = { stories: {} };
  private isLoaded = false;

  private loadCache(): void {
    if (this.isLoaded) return;

    try {
      if (fs.existsSync(CACHE_FILE)) {
        const data = fs.readFileSync(CACHE_FILE, 'utf-8');
        this.cache = JSON.parse(data);
      }
    } catch (error) {
      console.warn('Failed to load story cache:', error);
      this.cache = { stories: {} };
    }

    this.isLoaded = true;
  }

  private saveCache(): void {
    try {
      // Clean expired entries
      this.cleanExpiredEntries();

      fs.writeFileSync(CACHE_FILE, JSON.stringify(this.cache, null, 2));
    } catch (error) {
      console.error('Failed to save story cache:', error);
    }
  }

  private cleanExpiredEntries(): void {
    const now = new Date();
    const expiryTime = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000; // 30 days in milliseconds

    Object.keys(this.cache.stories).forEach(url => {
      const story = this.cache.stories[url];
      const createdAt = new Date(story.created_at);
      if (now.getTime() - createdAt.getTime() > expiryTime) {
        delete this.cache.stories[url];
      }
    });
  }

  getStory(url: string): CachedStory | null {
    this.loadCache();
    const story = this.cache.stories[url];

    if (story) {
      // Update last accessed time
      story.last_accessed = new Date().toISOString();
      this.saveCache();
      return story;
    }

    return null;
  }

  saveStory(url: string, title: string, chunks: StoryChunk[]): void {
    this.loadCache();

    this.cache.stories[url] = {
      title,
      story_chunks: chunks,
      created_at: new Date().toISOString(),
      last_accessed: new Date().toISOString()
    };

    this.saveCache();
  }

  getChunk(url: string, chunkNumber: number): StoryChunk | null {
    const story = this.getStory(url);
    if (!story) return null;

    return story.story_chunks.find(c => c.chunk_number === chunkNumber) || null;
  }

  hasCompleteStory(url: string): boolean {
    const story = this.getStory(url);
    if (!story) return false;

    // All cached stories are now complete stories
    return story.story_chunks.length > 0;
  }

  getCacheStats(): { totalStories: number; totalChunks: number; cacheSize: string } {
    this.loadCache();

    const totalStories = Object.keys(this.cache.stories).length;
    const totalChunks = Object.values(this.cache.stories).reduce(
      (sum, story) => sum + story.story_chunks.length,
      0
    );

    const stats = fs.statSync(CACHE_FILE);
    const cacheSize = `${(stats.size / 1024).toFixed(2)} KB`;

    return { totalStories, totalChunks, cacheSize };
  }
}

export const storyCache = new StoryCacheManager();