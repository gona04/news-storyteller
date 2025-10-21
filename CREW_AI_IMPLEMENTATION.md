# Crew AI Implementation Documentation

## Overview
The Storyteller application has been upgraded from a simple GPT-based text generation system to a sophisticated **Crew AI** system powered by **GPT-4o**. The Crew AI framework employs two specialized AI agents working sequentially to transform news articles into Tolstoy-inspired narratives.

## Architecture

### Crew AI Framework (src/lib/crewai.ts)
JavaScript implementation of the Crew AI framework with:

- **Agent Class**: Represents an AI agent with specific role, goal, and backstory
- **Task Class**: Defines work for agents to complete
- **Crew Class**: Orchestrates agents and tasks in sequential execution

### Two-Agent System

#### Agent 1: History Context Agent
- **Role**: Expert historian who researches internet history
- **Goal**: Find relevant historical context for the news article
- **Backstory**: Experienced historian with deep knowledge of world events
- **Task**: 
  - Analyze the news link
  - Extract historical context that makes the news understandable
  - Provide context summary with historical background

#### Agent 2: Tolstoy Narration Agent
- **Role**: Leo Tolstoy, classic Russian author
- **Goal**: Narrate the incident as Tolstoy would
- **Backstory**: The legendary author known for deep character analysis
- **Task**:
  - Read the article and historical context (from Agent 1)
  - Write narration in Tolstoy's style
  - Use simple language (5-year-old level comprehension)
  - Focus on human elements, emotions, and deeper meanings

## Process Flow

```
News Link Input
     ↓
[Crew AI Execution]
     ↓
Agent 1: History Research
     ├─ Search for historical context
     └─ Extract relevant background
     ↓
Agent 2: Tolstoy Narration
     ├─ Read article + historical context
     └─ Write literary narrative
     ↓
Cache Result
     ↓
Display to User
```

## API Endpoints

### POST /api/crewai-narrator
Generates Tolstoy-inspired narration for a news article.

**Request:**
```json
{
  "news_link": "https://example.com/news-article"
}
```

**Response:**
```json
{
  "success": true,
  "news_link": "https://example.com/news-article",
  "title": "Domain Name - Tolstoy's Narrative",
  "tolstoy_narration": "...",
  "cached": false,
  "timestamp": "2024-10-21T10:30:00Z"
}
```

### GET /api/crewai-narrator
Retrieves cached narration (if available).

**Query Parameter:**
- `news_link`: The news article URL

## Frontend Components

### CrewAI Page (src/app/crewai/page.tsx)
Main page component with:
- URL input for news articles
- Processing status display
- Results display with copy functionality
- Metadata showing cache status and timestamp

### NewsCard Integration
Updated to navigate to `/crewai?news_link={encodedUrl}` instead of storyteller.

## Caching System

- **Cache Directory**: `cache/crewai-narrator/`
- **Cache Key**: Hash-based filename derived from URL
- **Cache Content**: Full result object (narration + metadata)
- **Benefits**:
  - Instant retrieval for repeated articles
  - Reduced API calls to GPT-4o
  - Improved user experience

## Key Features

### 1. Sequential Agent Execution
- Agent 1 completes its task first
- Agent 2 receives Agent 1's output as context
- Results in coherent, historically-grounded narratives

### 2. GPT-4o Integration
- Uses OpenAI's GPT-4o model
- Temperature: 0.7 (balanced creativity)
- Max tokens: 2000 (comprehensive narratives)

### 3. Error Handling
- Graceful fallback on API failures
- Detailed error messages for debugging
- Cached results serve as backup

### 4. Performance Optimization
- URL-based caching prevents redundant API calls
- Efficient hash-based cache key generation
- Async/await for non-blocking operations

## Usage Flow

1. User clicks on news article in News Feed
2. Navigated to `/crewai?news_link={encodedUrl}`
3. Auto-processes news:
   - Checks cache first
   - If not cached, runs Crew AI
   - Saves result to cache
4. Displays Tolstoy narrative with:
   - Copy button
   - Metadata (timestamp, cache status)
   - Beautiful gradient UI

## Environment Variables Required

```
OPENAI_API_KEY=your_openai_api_key_here
```

## File Structure

```
src/
├── lib/
│   └── crewai.ts           # Crew AI framework
├── app/
│   ├── api/
│   │   └── crewai-narrator/
│   │       └── route.ts     # API endpoint
│   └── crewai/
│       ├── page.tsx         # Server page with Suspense
│       └── crew-ai-client.tsx # Client component
├── components/
│   ├── Storyteller.tsx      # Redirects to /crewai
│   └── NewsCard.tsx         # Updated navigation
└── ...
```

## Technical Details

### Crew AI Class Implementation

The `Crew` class manages:
- Multiple agents working on sequential tasks
- Task execution with context passing
- Verbose logging for debugging
- Result aggregation

### Agent Execution

Each agent:
- Builds a system prompt from role/goal/backstory
- Receives task description from its Task
- Makes API call to GPT-4o
- Returns result to Task for storage

### Task Execution

Each task:
- Gets executed by its assigned agent
- Passes context from previous tasks
- Stores output for next task to use
- Returns final output

## Future Enhancements

1. **Multi-Agent Coordination**
   - Add more specialized agents
   - Implement parallel task execution
   - Add hierarchical agent structures

2. **Advanced Caching**
   - Redis integration
   - Distributed cache
   - TTL-based cache expiration

3. **Voice Narration**
   - TTS integration for spoken narration
   - Multiple voice options
   - Timestamp-based audio segments

4. **Analytics**
   - Track agent performance
   - Monitor API usage
   - Cache hit rates

## Troubleshooting

### API Key Issues
- Ensure `OPENAI_API_KEY` is set in `.env.local`
- Verify key has sufficient quota
- Check key permissions for GPT-4o access

### Cache Issues
- Cache directory is auto-created
- Check file permissions on `cache/crewai-narrator/`
- Clear cache: `rm -rf cache/crewai-narrator/`

### Build Issues
- Ensure Suspense boundary is present
- Check for missing imports
- Verify TypeScript compilation

## Testing

To test the Crew AI system:

1. Start dev server: `npm run dev`
2. Navigate to http://localhost:3000
3. Click on any news article
4. System redirects to `/crewai?news_link={url}`
5. Crew AI processes and displays narration
6. Verify cache works on repeat articles

## Performance Metrics

- First API call: ~5-10 seconds (Crew AI processing)
- Cached retrieval: ~100ms
- Cache size: ~2-5KB per article
- Storage: ~1MB per 200-300 articles

## Conclusion

The Crew AI system transforms news articles into engaging literary narratives by combining historical research with creative storytelling. The two-agent architecture ensures both accuracy and engagement while maintaining performance through intelligent caching.
