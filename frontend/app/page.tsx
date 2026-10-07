'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { RightSidebar } from '@/components/layout/RightSidebar';
import { CategoryScroller } from '@/components/feed/CategoryScroller';
import { CreatePostWidget } from '@/components/feed/CreatePostWidget';
import { FeedPostCard } from '@/components/feed/FeedPostCard';
import { EmptyState } from '@/components/common/EmptyState';
import { Search, Sparkles } from 'lucide-react';

export default function HomePage() {
  const { posts } = useApp();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [feedSearch, setFeedSearch] = useState('');

  // Filter posts based on search and category
  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.content.toLowerCase().includes(feedSearch.toLowerCase()) ||
      post.businessName.toLowerCase().includes(feedSearch.toLowerCase()) ||
      post.location.toLowerCase().includes(feedSearch.toLowerCase()) ||
      post.attachedProduct?.title.toLowerCase().includes(feedSearch.toLowerCase()) ||
      post.attachedService?.title.toLowerCase().includes(feedSearch.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedCategory === 'all') return true;

    // Map category
    if (selectedCategory === 'electronics' && post.businessName.toLowerCase().includes('electronics')) return true;
    if (selectedCategory === 'fashion' && (post.businessName.toLowerCase().includes('silk') || post.content.toLowerCase().includes('saree'))) return true;
    if (selectedCategory === 'food' && post.businessName.toLowerCase().includes('spices')) return true;
    if (selectedCategory === 'home' && post.businessName.toLowerCase().includes('wood')) return true;
    if (selectedCategory === 'technology' && post.businessName.toLowerCase().includes('tech')) return true;
    if (selectedCategory === 'services' && (post.businessName.toLowerCase().includes('packaging') || post.businessName.toLowerCase().includes('tech'))) return true;

    return true;
  });

  return (
    <div className="flex gap-6 items-start justify-center">
      {/* Center: Social-Business Feed */}
      <div className="flex-1 max-w-2xl min-w-0 space-y-4">
          {/* In-feed quick search on mobile / quick search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#667085] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={feedSearch}
              onChange={(e) => setFeedSearch(e.target.value)}
              placeholder="Search posts, offers or verified updates in your feed..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-2xl text-xs sm:text-sm text-[#111111] placeholder-[#667085] focus:outline-none focus:border-[#2E3192] shadow-2xs transition-all"
            />
            {feedSearch && (
              <button
                onClick={() => setFeedSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#667085] hover:text-[#111111]"
              >
                Clear
              </button>
            )}
          </div>

          {/* Horizontal Category Scroller */}
          <CategoryScroller
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />

          {/* Create Post Widget */}
          <CreatePostWidget />

          {/* Social Business Feed Stream */}
          <div className="space-y-4">
            {filteredPosts.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="No posts found in this category"
                description="Try selecting 'All' or adjusting your search term to see more business updates."
                actionLabel="Reset Filters"
                onAction={() => {
                  setSelectedCategory('all');
                  setFeedSearch('');
                }}
              />
            ) : (
              filteredPosts.map((post) => (
                <FeedPostCard key={post.id} post={post} />
              ))
            )}
          </div>
        </div>

        {/* Right Sidebar (Recommendations, Trending, Referral) */}
        <RightSidebar />
      </div>
  );
}
