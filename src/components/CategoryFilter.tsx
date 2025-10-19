'use client';

import React from 'react';
import type { Category } from '@/lib/types';

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: Category;
  onCategoryChange: (category: Category) => void;
  articleCounts?: Partial<Record<Category, number>>;
}

export default function CategoryFilter({
  categories,
  selectedCategory,
  onCategoryChange,
  articleCounts = {}
}: CategoryFilterProps) {
  return (
    <div className="mb-8">
      <div className="flex flex-wrap gap-2 justify-center">
        {categories.map((category) => {
          const count = articleCounts[category] || 0;
          const isSelected = selectedCategory === category;

          return (
            <button
              key={category}
              onClick={() => onCategoryChange(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-md transform scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
              }`}
            >
              <span>{category}</span>
              {count > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  isSelected
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected category indicator */}
      <div className="text-center mt-4">
        <p className="text-sm text-gray-600">
          Showing articles from: <span className="font-semibold text-blue-600">{selectedCategory}</span>
          {articleCounts[selectedCategory] && (
            <span className="ml-1">
              ({articleCounts[selectedCategory]} articles)
            </span>
          )}
        </p>
      </div>
    </div>
  );
}