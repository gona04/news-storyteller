# Crew AI Quick Start Guide

## 🚀 Quick Setup

### 1. Environment Configuration
```bash
# Add to .env.local
OPENAI_API_KEY=sk-your-api-key-here
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Access the Application
- Visit http://localhost:3000
- Click on any news article
- System automatically redirects to Crew AI page
- Watch as agents transform news into Tolstoy narrative

## 📋 How It Works

### The Two-Agent System

**Agent 1: History Researcher** 📚
- Searches for historical context
- Extracts relevant background information
- Provides historical summary

**Agent 2: Tolstoy Narrator** ✍️
- Reads the article + historical context
- Writes in Tolstoy's literary style
- Uses simple, accessible language
- Focuses on human emotions and meanings

## 💻 API Usage

### Generate Narration
```bash
curl -X POST http://localhost:3000/api/crewai-narrator \
  -H "Content-Type: application/json" \
  -d '{"news_link": "https://example.com/article"}'
```

### Get Cached Narration
```bash
curl "http://localhost:3000/api/crewai-narrator?news_link=https://example.com/article"
```

## 🎯 Key Features

✅ **Crew AI Framework** - Two specialized agents working together
✅ **GPT-4o Powered** - Uses latest OpenAI model
✅ **Smart Caching** - No redundant API calls
✅ **Beautiful UI** - Gradient design with animations
✅ **Auto-Processing** - Click article → Instant narration
✅ **Copy to Clipboard** - One-click text copying

## 📁 File Structure

```
src/
├── lib/crewai.ts                          # Crew AI framework
├── app/api/crewai-narrator/route.ts       # API endpoint
└── app/crewai/
    ├── page.tsx                           # Server page
    └── crew-ai-client.tsx                 # Client component
```

## 🔄 Workflow

1. **User Action**: Click news article in feed
2. **Navigation**: Redirect to `/crewai?news_link={url}`
3. **Check Cache**: Look for existing narration
4. **Run Crew AI**: If not cached, execute agents
   - Agent 1: Research historical context
   - Agent 2: Write Tolstoy narrative
5. **Cache Result**: Save to file system
6. **Display**: Show beautiful formatted result

## 🧪 Testing

### Test with Your URL
```javascript
// In browser console
const url = 'https://example.com/news-article';
const encodedUrl = encodeURIComponent(url);
window.location.href = `/crewai?news_link=${encodedUrl}`;
```

### Manual API Test
```bash
# Terminal command
curl -X POST http://localhost:3000/api/crewai-narrator \
  -H "Content-Type: application/json" \
  -d '{"news_link":"https://thehindu.com/news/..."}' | jq .
```

## ⚡ Performance

- **First Load**: 5-10 seconds (Crew AI processing)
- **Cached Load**: 100ms (instant retrieval)
- **Cache Size**: ~2-5KB per article
- **Total Cache**: ~1MB per 200-300 articles

## 🐛 Troubleshooting

### Issue: "Cannot find module '@anthropic-ai/sdk'"
**Solution**: Using OpenAI SDK instead (already configured)

### Issue: "Crew AI not processing"
**Solution**: 
- Check `.env.local` has `OPENAI_API_KEY`
- Verify API key is valid
- Check browser console for errors

### Issue: "Cache not working"
**Solution**:
- Verify `cache/crewai-narrator/` directory exists
- Check file permissions
- Clear cache: `rm -rf cache/crewai-narrator/`

### Issue: Build errors with Suspense
**Solution**: Page properly wrapped in Suspense boundary (already done)

## 📊 Example Response

```json
{
  "success": true,
  "news_link": "https://thehindu.com/news/...",
  "title": "thehindu - Tolstoy's Narrative",
  "tolstoy_narration": "In the grand theater of human affairs, where destiny plays...",
  "cached": false,
  "timestamp": "2024-10-21T10:30:00Z"
}
```

## 🎨 UI Features

- **Dark Theme** with amber/gold accents
- **Gradient Background** for visual appeal
- **Smooth Animations** with Framer Motion
- **Loading Spinner** during processing
- **Copy Button** for easy text sharing
- **Responsive Design** - works on mobile/desktop
- **Cache Badge** - shows if result is from cache

## 🔐 Security

- API keys stored in `.env.local` (not committed)
- URL encoding prevents injection attacks
- File-based caching is secure
- No sensitive data in response

## 📚 Next Steps

1. Customize agent prompts in `src/lib/crewai.ts`
2. Add TTS narration for voice output
3. Integrate with Redis for distributed caching
4. Add more specialized agents
5. Implement analytics dashboard

## 💡 Tips

- Longer articles produce richer Tolstoy narratives
- Historical events get better context from agents
- Cache saves API costs significantly
- Copy button makes sharing easier
- Try different URL sources for variety

## 🎓 Learning Resources

- [Crew AI Docs](https://github.com/joaomdmoura/crewAI)
- [OpenAI API](https://platform.openai.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

---

**Ready to transform news into literature?** 🚀
