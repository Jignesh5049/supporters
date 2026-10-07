'use client';

import React from 'react';
import { CATEGORIES } from '@/lib/mock-data';
import {
  Layers,
  Tv,
  Shirt,
  Utensils,
  Home,
  Car,
  Sprout,
  Wrench,
  Sparkles,
  GraduationCap,
  Cpu,
  Hammer,
  MoreHorizontal
} from 'lucide-react';

interface CategoryScrollerProps {
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Layers,
  Tv,
  Shirt,
  Utensils,
  Home,
  Car,
  Sprout,
  Wrench,
  Sparkles,
  GraduationCap,
  Cpu,
  Hammer,
  MoreHorizontal
};

export function CategoryScroller({
  selectedCategory,
  onSelectCategory
}: CategoryScrollerProps) {
  return (
    <div className="w-full bg-white border border-[#E5E7EB] rounded-2xl p-2.5 shadow-2xs">
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
        {CATEGORIES.map((cat) => {
          const Icon = ICON_MAP[cat.iconName] || Layers;
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                isSelected
                  ? 'bg-[#2E3192] text-white shadow-xs'
                  : 'bg-[#F7F8FC] text-[#667085] hover:text-[#111111] hover:bg-gray-100 border border-transparent'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-[#667085]'}`} />
              <span>{cat.name}</span>
              {cat.trending && !isSelected && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#A3238E]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
