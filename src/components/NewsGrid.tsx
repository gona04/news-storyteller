'use client';

import React, { useState, useEffect } from 'react';
import NewsCard from './NewsCard';
import CategoryFilter from './CategoryFilter';
import type { NewsArticle, Category, NewsData } from '@/lib/types';

interface NewsGridProps {
  initialData?: NewsData;
}

export default function NewsGrid({ initialData }: NewsGridProps) {
  const [newsData, setNewsData] = useState<NewsData | null>(initialData || null);
  const [selectedCategory, setSelectedCategory] = useState<Category>('All');
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Available categories
  const categories: Category[] = ['All', 'National', 'International', 'Business', 'Cities', 'Technology', 'Sports', 'General'];

  // Fetch news data
  const fetchNews = async (category?: Category, forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (category && category !== 'All') {
        params.append('category', category);
      }
      if (forceRefresh) {
        params.append('refresh', 'true');
      }

      const response = await fetch(`/api/news?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setNewsData(data);
      } else {
        setError(data.error || 'Failed to fetch news');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch news');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle category change
  const handleCategoryChange = (category: Category) => {
    setSelectedCategory(category);
    fetchNews(category);
  };

  // Handle manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNews(selectedCategory, true);
  };

  // Initial load
  useEffect(() => {
    if (!initialData) {
      fetchNews();
    }
  }, []);

  // Calculate article counts by category
  const getArticleCounts = (): Partial<Record<Category, number>> => {
    if (!newsData?.data?.articles) return {};

    const counts: Partial<Record<Category, number>> = {};
    newsData.data.articles.forEach(article => {
      counts[article.category as Category] = (counts[article.category as Category] || 0) + 1;
    });

    // Add "All" count
    counts.All = newsData.data.totalArticles;
    return counts;
  };

  const articleCounts = getArticleCounts();

  if (loading && !newsData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600 text-lg">Loading latest news...</p>
        </div>
      </div>
    );
  }

  if (error && !newsData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Failed to Load News</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => fetchNews()}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full transition-all duration-200 font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const articles = newsData?.data?.articles || [];
  const cacheInfo = newsData?.data?.cacheInfo;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
              </div>
            </div>
            <div className="flex items-center space-x-6">
              {/* Refresh button */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-medium text-sm"
              >
                {refreshing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : (
                  <span>🔄</span>
                )}
                <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="mb-16">
          <h2 className="text-5xl sm:text-6xl font-light text-gray-900 mb-4">
            Stories from <span className="text-green-600 font-semibold">Today</span>
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl">
            Discover the most compelling news stories, beautifully presented and thoughtfully curated.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <span className="text-red-600 mr-3 text-lg">⚠️</span>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block relative w-12 h-12 mb-3">
              <div className="absolute inset-0 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-600">Loading articles...</p>
          </div>
        )}

        {/* News grid */}
        {articles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article, index) => (
              <NewsCard key={`${article.id}-${article.category}-${index}`} article={article} />
            ))}
          </div>
        ) : !loading && (
          <div className="text-center py-16">
            <div className="text-gray-400 text-6xl mb-4">📰</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No stories found in this category.</h3>
            <p className="text-gray-600">
              {selectedCategory === 'All'
                ? 'Check back soon for more stories.'
                : `Try a different category to explore more stories.`
              }
            </p>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-gray-200 text-center text-gray-600 text-sm">
          <p>
            📰 Data sourced from ABC News • ⏰ Auto-refreshes daily at 6:00 AM
            {newsData?.data?.fromCache && ' • 💾 Showing cached data'}
          </p>
        </footer>
      </main>
    </div>
  );
}