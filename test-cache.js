import { storyCache } from './lib/storyCache.js';

async function testCache() {
  console.log('Testing story cache...');

  // Test saving a story
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

  console.log('Saving test story...');
  storyCache.saveStory(testUrl, testTitle, testChunks);

  // Test retrieving the story
  console.log('Retrieving test story...');
  const retrievedStory = storyCache.getStory(testUrl);

  if (retrievedStory) {
    console.log('✅ Story retrieved successfully');
    console.log('Title:', retrievedStory.title);
    console.log('Chunks:', retrievedStory.story_chunks.length);
    console.log('From cache:', !!retrievedStory);
  } else {
    console.log('❌ Story not found');
  }

  // Test cache stats
  const stats = storyCache.getCacheStats();
  console.log('Cache stats:', stats);

  // Test getting a specific chunk
  const chunk1 = storyCache.getChunk(testUrl, 1);
  console.log('Chunk 1:', chunk1?.chunk.substring(0, 50) + '...');
}

testCache().catch(console.error);