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
    <div className="mb-12">
      <div className="flex flex-wrap gap-3 justify-center px-4 py-6">
        {categories.map((category) => {
          const count = articleCounts[category] || 0;
          const isSelected = selectedCategory === category;

          return (
            <button
              key={category}
              onClick={() => onCategoryChange(category)}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                isSelected
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <span>{category}</span>
              {count > 0 && (
                <span className="ml-2 text-xs opacity-75">
                  ({count})
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}