import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import axios from 'axios';
import * as cheerio from 'cheerio';

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

// In-memory storage for story sessions (in production, use a database)
const storySessions = new Map<string, {
  articleContent: string;
  chunks: string[];
  currentChunk: number;
}>();

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

${previousChunks.length > 0 ? `PREVIOUS CHUNKS:\n${previousChunks.join('\n\n')}\n\nContinue the story from here.` : 'This is the beginning of the story.'}

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

    // Generate session ID if not provided
    const currentSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    let session = storySessions.get(currentSessionId);

    // If this is the first chunk or new session, fetch and analyze the article
    if (!session || chunkNumber === 1) {
      console.log('Fetching article content...');
      const articleContent = await fetchArticleContent(url);

      session = {
        articleContent,
        chunks: [],
        currentChunk: 0
      };
      storySessions.set(currentSessionId, session);
    }

    // Generate the requested chunk
    console.log(`Generating chunk ${chunkNumber}...`);
    const chunkContent = await generateStoryChunk(
      session.articleContent,
      chunkNumber,
      session.chunks
    );

    // Store the chunk
    session.chunks.push(chunkContent);
    session.currentChunk = chunkNumber;

    // Determine if there are more chunks (simplified logic)
    const hasMore = chunkNumber < 5; // Maximum 5 chunks

    const response: StoryChunk = {
      chunk_number: chunkNumber,
      chunk: chunkContent,
      has_more: hasMore
    };

    return NextResponse.json({
      ...response,
      sessionId: currentSessionId
    });

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
  const sessionId = searchParams.get('sessionId');

  if (!sessionId || !storySessions.has(sessionId)) {
    return NextResponse.json(
      { error: 'Invalid or expired session' },
      { status: 404 }
    );
  }

  const session = storySessions.get(sessionId)!;

  return NextResponse.json({
    sessionId,
    currentChunk: session.currentChunk,
    totalChunks: session.chunks.length,
    chunks: session.chunks
  });
}