'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader, Copy, Check, Sparkles } from 'lucide-react';

interface CrewAIResult {
  success: boolean;
  news_link: string;
  title: string;
  tolstoy_narration: string;
  cached: boolean;
  timestamp: string;
}

export default function CrewAIPage() {
  const searchParams = useSearchParams();
  const [newsLink, setNewsLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CrewAIResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [autoStarted, setAutoStarted] = useState(false);

  // Check for URL parameter on component mount
  useEffect(() => {
    const urlParam = searchParams.get('news_link');
    if (urlParam && !autoStarted) {
      const decodedUrl = decodeURIComponent(urlParam);
      setNewsLink(decodedUrl);
      setAutoStarted(true);
      processNews(decodedUrl);
    }
  }, [searchParams, autoStarted]);

  const processNews = async (url: string) => {
    setError('');
    setResult(null);

    if (!url.trim()) {
      setError('Please enter a news link');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/crewai-narrator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ news_link: url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to process news');
      }

      const data: CrewAIResult = await response.json();
      setResult(data);
      setNewsLink('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await processNews(newsLink);
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result.tolstoy_narration);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-600 text-white rounded-lg flex items-center justify-center font-bold text-lg">
                NS
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  News <span className="font-normal">Storyteller</span>
                </h1>
                <p className="text-xs text-gray-600">Powered by Crew AI</p>
              </div>
            </div>
            <nav className="flex space-x-6">
              <a href="/" className="text-gray-700 hover:text-gray-900 font-medium">
                Back to Feed
              </a>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-12 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Transform News with <span className="text-green-600">Crew AI</span>
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Enter a news article URL and watch as our AI agents transform it into a Tolstoy-inspired literary narrative.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mb-8 bg-white rounded-lg shadow-md p-6 border border-gray-200"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="url"
              value={newsLink}
              onChange={(e) => setNewsLink(e.target.value)}
              placeholder="Enter news article URL..."
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition text-sm sm:text-base"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 sm:px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {loading ? (
                <>
                  <Loader className="w-4 sm:w-5 h-4 sm:h-5 animate-spin" />
                  <span className="hidden sm:inline">Processing...</span>
                  <span className="sm:hidden">Process</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 sm:w-5 h-4 sm:h-5" />
                  Generate
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </form>

        {loading && (
          <div className="text-center mb-8">
            <div className="inline-flex flex-col items-center gap-4">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin"></div>
              </div>
              <div>
                <p className="text-gray-900 font-semibold">Crew AI Processing</p>
                <p className="text-gray-600 text-sm">History Research Agent is working...</p>
              </div>
            </div>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6 sm:p-8 border border-gray-200">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{result.title}</h2>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-gray-600 text-xs sm:text-sm gap-2">
                <p>
                  {new Date(result.timestamp).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
                {result.cached && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 border border-green-300 rounded-full text-green-700 text-xs font-semibold">
                    <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                    From cache
                  </span>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 sm:p-8 border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-green-600" />
                  Tolstoy's Narrative
                </h3>
                <button
                  onClick={handleCopy}
                  className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-700"
                  title="Copy to clipboard"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>

              <div className="prose prose-sm max-w-none">
                <div className="text-gray-700 text-sm sm:text-base leading-relaxed space-y-4">
                  {result.tolstoy_narration.split('\n\n').map((paragraph, idx) => (
                    <p key={idx} className="text-justify">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-gray-600 text-xs sm:text-sm">
                Source: <span className="text-gray-700 font-mono text-xs break-all">{result.news_link}</span>
              </p>
            </div>

            <button
              onClick={() => {
                setResult(null);
                setNewsLink('');
                setAutoStarted(false);
              }}
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition"
            >
              Process Another Article
            </button>
          </div>
        )}

        {!result && !loading && (
          <div className="text-center py-12 text-gray-600">
            <p className="text-sm sm:text-base">Enter a news link and click Generate to transform it into a Tolstoy-inspired narrative</p>
          </div>
        )}
      </div>
    </div>
  );
}
