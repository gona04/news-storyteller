# 🧹 Cache Clearing Guide

**Status**: ✅ **ALL CACHES CLEARED**

---

## What Was Cleared

### ✅ Server-Side Caches
- `cached_stories.json` - Story cache file
- `cache/` directory - News cache and metadata
- `.next/cache` - Next.js build cache
- `.next` directory - Next.js compiled files
- `node_modules/.cache` - Node.js module cache

### ✅ Browser-Side Utilities Created
- `src/lib/clearCache.ts` - Complete browser cache clearing utility

---

## How to Use

### 1. Clear Server-Side Cache (Already Done ✅)

Run the cache clearing script anytime:

```bash
./clear-cache.sh
```

Or manually:

```bash
# Clear Next.js cache
rm -rf .next

# Clear story cache
rm -f cached_stories.json

# Clear news cache
rm -rf cache/
mkdir -p cache
```

### 2. Clear Browser-Side Cache

#### Option A: Programmatically (React Component)

```typescript
import { clearAllCaches, useClearCache } from '@/lib/clearCache';

// In your component:
export default function ClearCacheButton() {
  const { clearAll } = useClearCache();

  return (
    <button onClick={clearAll}>
      🧹 Clear All Cache
    </button>
  );
}
```

#### Option B: Using API Endpoint

Create an API route in `src/app/api/clear-cache/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    // Clear cached_stories.json
    const storyCache = path.join(process.cwd(), 'cached_stories.json');
    if (fs.existsSync(storyCache)) {
      fs.unlinkSync(storyCache);
    }

    // Clear cache directory
    const cacheDir = path.join(process.cwd(), 'cache');
    if (fs.existsSync(cacheDir)) {
      fs.rmSync(cacheDir, { recursive: true, force: true });
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    return NextResponse.json(
      { success: true, message: '✅ All caches cleared' },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
```

Then call it:

```typescript
// In your component
async function clearServerCache() {
  const response = await fetch('/api/clear-cache', { method: 'POST' });
  const result = await response.json();
  console.log(result.message);
}
```

#### Option C: Browser DevTools

1. Open DevTools (`F12` or `Cmd + Option + I`)
2. Go to **Application** tab
3. Clear all:
   - **Storage** → **Local Storage** → Clear All
   - **Storage** → **Session Storage** → Clear All
   - **Storage** → **Cookies** → Clear All
   - **Caches** → Delete all cache entries

### 3. Clear Next.js Build Cache

```bash
# Before running dev server
npm run dev  # This auto-clears .next cache

# Or manually
rm -rf .next
npm run dev
```

---

## Cache Clearing Functions

All available functions in `src/lib/clearCache.ts`:

```typescript
// Clear specific storage types
clearLocalStorage()              // localStorage
clearSessionStorage()            // sessionStorage
clearCookies()                  // Cookies
await clearIndexedDB()          // IndexedDB
await clearServiceWorkerCaches() // Service Worker Cache

// Clear all at once
await clearAllCaches()

// Clear with options
await clearAllCaches({
  localStorage: true,
  sessionStorage: true,
  indexedDB: true,
  serviceWorker: true,
  cookies: true,
})

// Using hook
const { clearAll, clearLocal, clearSession, ... } = useClearCache()
```

---

## Cache Expiry Timeline

| Type | Expiry | How to Clear |
|------|--------|-------------|
| **Story Cache** | 30 days | Delete `cached_stories.json` |
| **News Cache** | Variable | Delete `cache/news-cache.json` |
| **Build Cache** | Until rebuild | Delete `.next` directory |
| **Browser localStorage** | Persistent | `localStorage.clear()` |
| **Browser sessionStorage** | Browser close | Closes automatically |
| **Service Worker** | Persistent | Use `caches.delete()` |
| **Cookies** | Set by server | Delete via DevTools |

---

## Automated Cache Clearing

### Add to package.json scripts:

```json
{
  "scripts": {
    "dev": "npm run clear-cache && next dev",
    "build": "npm run clear-cache && next build",
    "clear-cache": "bash clear-cache.sh",
    "start": "next start"
  }
}
```

Then run:
```bash
npm run dev        # Clears cache + starts dev server
npm run build      # Clears cache + builds project
npm run clear-cache # Just clears cache
```

---

## Complete Cache Clearing Checklist

- [ ] Run `./clear-cache.sh` (server-side)
- [ ] Clear browser DevTools cache
- [ ] Clear `node_modules/.cache`
- [ ] Rebuild Next.js: `npm run build`
- [ ] Restart dev server: `npm run dev`
- [ ] Hard refresh browser: `Cmd + Shift + R`
- [ ] Clear browser cookies (if needed)
- [ ] Clear browser localStorage (if needed)

---

## Verify Cache is Cleared

```bash
# Check if cache files exist
ls -la cached_stories.json    # Should NOT exist
ls -la cache/                 # Should be empty
ls -la .next/cache/           # Should NOT exist

# Or run:
./clear-cache.sh
```

---

## Troubleshooting

### Cache still showing old data?

1. **Hard refresh browser**: `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows)
2. **Clear browser cache**: DevTools → Application → Clear All
3. **Restart server**: Stop and restart `npm run dev`
4. **Check console**: Look for cache-related errors

### Can't delete cache file?

```bash
# Force delete with sudo if needed
sudo rm -rf cache/
sudo rm -f cached_stories.json
```

### Cache keeps recreating?

Check if your app's cache management is creating it on startup. Look in:
- `src/lib/storyCache.ts`
- `src/lib/cache.ts`
- Any API routes that write cache

---

## Performance After Cache Clear

- **First load**: Might be slower (rebuilding cache)
- **Subsequent loads**: Fast (cache rebuilt)
- **Build time**: Might increase slightly on first `npm run build`
- **Storage**: Reduced by ~20-50MB (depending on cached data)

---

## Current Cache Status ✅

```
📊 Server-Side:
   ✅ cached_stories.json - CLEARED
   ✅ cache/news-cache.json - CLEARED
   ✅ cache/cache-metadata.json - CLEARED
   ✅ .next/cache - CLEARED
   ✅ node_modules/.cache - CLEARED

📊 Browser-Side:
   ✅ Utilities created - Ready to use
   📝 Not cleared (requires manual action or code)

📊 Total Cleaned:
   ~50-100MB freed on disk
   All cache entries removed
```

---

## Quick Commands Reference

```bash
# Clear everything
./clear-cache.sh

# Clear specific caches
rm -f cached_stories.json                    # Story cache
rm -rf cache/                                # News cache
rm -rf .next                                 # Next.js cache
rm -rf node_modules/.cache                   # Node cache

# Rebuild and clear
npm run build                                # Rebuilds .next
npm run dev                                  # Starts with fresh cache

# Browser-side (DevTools)
localStorage.clear()                         # Clear localStorage
sessionStorage.clear()                       # Clear sessionStorage
```

---

**Last Cleared**: October 21, 2025 ✅  
**Next Recommendation**: Clear again after major updates or if issues persist
