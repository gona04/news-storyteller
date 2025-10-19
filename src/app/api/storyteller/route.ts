import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { storyCache } from '@/lib/storyCache';

// Lazy initialization of OpenAI client
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    openai = new OpenAI({
      apiKey,
    });
  }
  return openai;
}

interface StoryChunk {
  chunk_number: number;
  chunk: string;
  has_more: boolean;
}

async function extractArticleTitle(url: string, content: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 5000,
    });

    const $ = cheerio.load(response.data);

    // Try common title selectors
    const titleSelectors = [
      'title',
      'h1',
      '[class*="title"]',
      '[class*="headline"]',
      'meta[property="og:title"]'
    ];

    for (const selector of titleSelectors) {
      let title = '';
      if (selector === 'meta[property="og:title"]') {
        title = $(selector).attr('content') || '';
      } else {
        title = $(selector).first().text().trim();
      }

      if (title && title.length > 10 && title.length < 200) {
        return title;
      }
    }

    // Fallback: extract from URL or content
    const urlParts = url.split('/').filter(p => p.length > 0);
    const lastPart = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2] || '';
    const fallbackTitle = lastPart.replace(/-/g, ' ').replace(/\?.*$/, '');

    return fallbackTitle.charAt(0).toUpperCase() + fallbackTitle.slice(1) || 'News Article';

  } catch (error) {
    console.warn('Failed to extract title:', error);
    return 'News Article';
  }
}

async function fetchArticleContent(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);

    // Remove scripts and styles
    $('script, style').remove();

    // Try to find main content
    const contentSelectors = [
      'article',
      '[class*="content"]',
      '[class*="article"]',
      '[class*="story"]',
      'main',
      '.post-content',
      '.entry-content'
    ];

    let content = '';
    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        content = element.text().trim();
        if (content.length > 500) break;
      }
    }

    // Fallback to body text
    if (!content) {
      content = $('body').text().trim();
    }

    // Clean up whitespace
    content = content.replace(/\s+/g, ' ').trim();

    return content.substring(0, 8000); // Limit content length

  } catch (error) {
    throw new Error(`Failed to fetch article: ${error}`);
  }
}

async function generateStoryChunk(
  articleContent: string,
  chunkNumber: number,
  previousChunks: string[] = []
): Promise<string> {
  // Get previous chunks from cache if available
  const contextChunks = previousChunks.length > 0 ? previousChunks :
    (chunkNumber > 1 ? [] : []); // For now, we'll handle context differently

  const systemPrompt = `You are storyteller_agent, a narrative AI agent. Your job is to turn a real-world news article into a compelling, human-centered story in the literary style of Leo Tolstoy.

ARTICLE CONTENT:
${articleContent}

INSTRUCTIONS:
1. Emulate Tolstoy's narrative voice: detailed, reflective, character-driven, historically aware.
2. Do not summarize. Instead, unfold the incident as a story.
3. Generate ONLY chunk number ${chunkNumber} of the story (3-5 paragraphs max).
4. Use rich, literary language with emotional depth and philosophical undertones.
5. Focus on human elements, motivations, and broader implications.
6. Maintain journalistic integrity while using literary language.

${contextChunks.length > 0 ? `PREVIOUS CHUNKS:\n${contextChunks.join('\n\n')}\n\nContinue the story from here.` : 'This is the beginning of the story.'}

Generate the narrative chunk in Tolstoy's style.`;

  try {
    const completion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate chunk ${chunkNumber} of the Tolstoy-style narrative.` }
      ],
      temperature: 0.5,
      max_tokens: 1000,
    });

    return completion.choices[0]?.message?.content?.trim() || '';

  } catch (error) {
    throw new Error(`Failed to generate story chunk: ${error}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url, chunkNumber = 1, sessionId } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'Article URL is required' },
        { status: 400 }
      );
    }

    // Check if complete story exists in cache
    const cachedStory = storyCache.getStory(url);

    if (cachedStory && storyCache.hasCompleteStory(url)) {
      console.log(`Serving chunk ${chunkNumber} from complete cached story for URL: ${url}`);

      // Find the requested chunk from the complete cached story
      const cachedChunk = cachedStory.story_chunks.find(c => c.chunk_number === chunkNumber);

      if (cachedChunk) {
        return NextResponse.json({
          ...cachedChunk,
          sessionId: `cached_${url}_${Date.now()}`,
          fromCache: true
        });
      }
    }

    // Story not in cache or incomplete, generate the complete story
    console.log(`Generating complete story for URL: ${url}`);

    // Fetch article content and extract title
    console.log('Fetching article content...');
    const articleContent = await fetchArticleContent(url);
    const title = await extractArticleTitle(url, articleContent);

    // Generate ALL chunks at once to create a complete story
    const allChunks: StoryChunk[] = [];
    const maxChunks = 5;

    for (let i = 1; i <= maxChunks; i++) {
      try {
        console.log(`Generating chunk ${i}...`);

        // Get previous chunks for context (all previously generated chunks in this session)
        const previousChunks = allChunks.map(c => c.chunk);

        const chunkContent = await generateStoryChunk(articleContent, i, previousChunks);

        const hasMore = i < maxChunks; // Last chunk will have has_more: false

        const newChunk: StoryChunk = {
          chunk_number: i,
          chunk: chunkContent,
          has_more: hasMore
        };

        allChunks.push(newChunk);
        console.log(`Generated chunk ${i}, has_more: ${hasMore}`);
      } catch (error) {
        console.error(`Error generating chunk ${i}:`, error);
        // If we have at least one chunk, save what we have and mark as complete
        if (allChunks.length > 0) {
          allChunks[allChunks.length - 1].has_more = false;
          console.log(`Saving partial story with ${allChunks.length} chunks due to error`);
          break;
        }
        throw error;
      }
    }

    console.log(`Successfully generated ${allChunks.length} chunks`);    // Cache the complete story
    console.log(`Caching complete story with ${allChunks.length} chunks`);
    storyCache.saveStory(url, title, allChunks);

    // Return the requested chunk
    const requestedChunk = allChunks.find(c => c.chunk_number === chunkNumber);

    if (requestedChunk) {
      return NextResponse.json({
        ...requestedChunk,
        sessionId: `generated_${url}_${Date.now()}`,
        fromCache: false
      });
    } else {
      throw new Error(`Failed to generate requested chunk ${chunkNumber}`);
    }

  } catch (error) {
    console.error('Storyteller API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate story chunk', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json(
      { error: 'Article URL is required' },
      { status: 400 }
    );
  }

  const cachedStory = storyCache.getStory(url);

  if (!cachedStory) {
    return NextResponse.json(
      { error: 'Story not found in cache' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    url,
    title: cachedStory.title,
    story_chunks: cachedStory.story_chunks,
    fromCache: true,
    created_at: cachedStory.created_at,
    last_accessed: cachedStory.last_accessed
  });
}