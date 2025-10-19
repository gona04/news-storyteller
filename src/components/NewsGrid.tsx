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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading latest news...</p>
        </div>
      </div>
    );
  }

  if (error && !newsData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load News</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => fetchNews()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
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
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">The Hindu News</h1>
              <p className="text-gray-600 mt-1">Latest headlines and articles</p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Refresh button */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {refreshing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <span>🔄</span>
                )}
                <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>

              {/* Cache info */}
              {cacheInfo && (
                <div className="text-sm text-gray-500">
                  <div>Last updated: {new Date(cacheInfo.lastUpdated).toLocaleString()}</div>
                  {cacheInfo.nextRefresh && (
                    <div>Next refresh: {new Date(cacheInfo.nextRefresh).toLocaleString()}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category filter */}
        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
          articleCounts={articleCounts}
        />

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <span className="text-red-500 mr-2">⚠️</span>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Loading articles...</p>
          </div>
        )}

        {/* News grid */}
        {articles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <NewsCard key={article.id} article={article} />
            ))}
          </div>
        ) : !loading && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📰</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Articles Found</h3>
            <p className="text-gray-600">
              {selectedCategory === 'All'
                ? 'No news articles are currently available.'
                : `No articles found in the ${selectedCategory} category.`
              }
            </p>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-gray-500 text-sm">
          <p>
            Data sourced from The Hindu •
            Auto-refreshes daily at 6:00 AM •
            {newsData?.data?.fromCache && ' (Showing cached data)'}
          </p>
        </footer>
      </main>
    </div>
  );
}