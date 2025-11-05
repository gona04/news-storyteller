import React from 'react';
import { useRouter } from 'next/navigation';
import type { NewsArticle } from '@/lib/types';

interface NewsCardProps {
  article: NewsArticle;
}

export default function NewsCard({ article }: NewsCardProps) {
  const router = useRouter();

  // Format the published date to 12-hour format
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return dateString;
    }
  };

  const handleCardClick = () => {
    // Navigate to AI Storyteller page with the article URL as a query parameter
    const encodedUrl = encodeURIComponent(article.url);
    router.push(`/crewai?news_link=${encodedUrl}`);
  };

  return (
    <div
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 border border-gray-200 cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex flex-col space-y-3">
        {/* Category Badge */}
        <div className="flex items-center justify-between">
          <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
            {article.category}
          </span>
          <span className="text-xs text-gray-500">
            {formatDate(article.publishedAt)}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 leading-tight line-clamp-3 hover:text-green-600 transition-colors">
          {article.title}
        </h3>

        {/* Summary (if available) */}
        {article.summary && article.summary.trim() && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {article.summary}
          </p>
        )}

        {/* Footer with source and date */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-500">
            ABC News
          </span>
          <span className="text-xs text-gray-400">
            {formatDate(article.scrapedAt)}
          </span>
        </div>

        {/* Storyteller hint */}
        <div className="flex items-center justify-center pt-2 border-t border-gray-100">
          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
            ✨ Click to transform with AI
          </span>
        </div>
      </div>
    </div>
  );
}