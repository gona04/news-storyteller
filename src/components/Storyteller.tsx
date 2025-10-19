'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { BookOpen, Loader2, ChevronRight } from 'lucide-react';

interface StoryChunk {
  chunk_number: number;
  chunk: string;
  has_more: boolean;
  sessionId?: string;
}

export default function Storyteller() {
  const searchParams = useSearchParams();
  const [url, setUrl] = useState('');
  const [chunks, setChunks] = useState<StoryChunk[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [autoStarted, setAutoStarted] = useState(false);

  // Check for URL parameter on component mount
  useEffect(() => {
    const urlParam = searchParams.get('url');
    if (urlParam && !autoStarted) {
      const decodedUrl = decodeURIComponent(urlParam);
      setUrl(decodedUrl);
      setAutoStarted(true);
      // Automatically start the story
      startStory(decodedUrl);
    }
  }, [searchParams, autoStarted]);

  const startStory = async (articleUrl?: string) => {
    const targetUrl = articleUrl || url;
    if (!targetUrl.trim()) {
      setError('Please enter a valid article URL');
      return;
    }

    setLoading(true);
    setError('');
    setChunks([]);
    setSessionId(null);

    try {
      const response = await fetch('/api/storyteller', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: targetUrl.trim(), chunkNumber: 1 }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start story');
      }

      setChunks([data]);
      setSessionId(data.sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const loadNextChunk = async () => {
    if (!sessionId || chunks.length === 0) return;

    setLoading(true);
    setError('');

    try {
      const nextChunkNumber = chunks.length + 1;
      const response = await fetch('/api/storyteller', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          chunkNumber: nextChunkNumber,
          sessionId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load next chunk');
      }

      setChunks(prev => [...prev, data]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetStory = () => {
    setChunks([]);
    setSessionId(null);
    setError('');
    setUrl('');
    setAutoStarted(false);
    // Clear URL parameter from browser
    window.history.replaceState({}, '', '/storyteller');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">News Storyteller</h1>
              <p className="text-gray-600 mt-1">Latest headlines and literary narratives</p>
            </div>
            <nav className="flex space-x-4">
              <a
                href="/"
                className="text-gray-700 hover:text-blue-600 font-medium"
              >
                News Feed
              </a>
              <a
                href="/storyteller"
                className="text-blue-600 hover:text-blue-800 font-medium border-b-2 border-blue-600"
              >
                Literary Stories
              </a>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BookOpen className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Literary Storyteller</h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Transform news articles into compelling Tolstoy-style narratives.
            Experience the story unfold in literary chunks, rich with human emotion and historical depth.
          </p>
        </div>

        {/* URL Input */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex gap-4">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter news article URL..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              onClick={() => startStory()}
              disabled={loading || !url.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <BookOpen className="w-5 h-5" />
              )}
              {chunks.length > 0 ? 'Restart Story' : 'Begin Story'}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Story Display */}
        {chunks.length > 0 && (
          <div className="space-y-6">
            {chunks.map((chunk, index) => (
              <div key={chunk.chunk_number} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">
                      {chunk.chunk_number}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Chapter {chunk.chunk_number}
                  </h3>
                </div>

                <div className="prose prose-lg max-w-none">
                  {chunk.chunk.split('\n\n').map((paragraph, pIndex) => (
                    <p key={pIndex} className="mb-4 text-gray-700 leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            ))}

            {/* Continue Button */}
            {chunks[chunks.length - 1]?.has_more && (
              <div className="text-center">
                <button
                  onClick={loadNextChunk}
                  disabled={loading}
                  className="px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Crafting next chapter...
                    </>
                  ) : (
                    <>
                      <ChevronRight className="w-5 h-5" />
                      Continue the Story
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Story Complete */}
            {!chunks[chunks.length - 1]?.has_more && (
              <div className="text-center py-8">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-8">
                  <BookOpen className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    The End
                  </h3>
                  <p className="text-gray-600 mb-6">
                    This literary journey has reached its conclusion.
                  </p>
                  <button
                    onClick={resetStory}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Tell Another Story
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        {chunks.length === 0 && (
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              How It Works
            </h3>
            <ul className="text-blue-800 space-y-2">
              <li>• Click any news article from the News Feed to automatically start a literary story</li>
              <li>• Or enter any news article URL from a reputable source manually</li>
              <li>• The AI analyzes the article and transforms it into a Tolstoy-style narrative</li>
              <li>• Read the story unfold in literary chunks, each revealing more of the human story</li>
              <li>• Experience journalism through the lens of literary fiction</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}