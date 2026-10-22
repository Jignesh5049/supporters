'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { RightSidebar } from '@/components/layout/RightSidebar';
import { CategoryScroller } from '@/components/feed/CategoryScroller';
import { CreatePostWidget } from '@/components/feed/CreatePostWidget';
import { FeedPostCard } from '@/components/feed/FeedPostCard';
import { EmptyState } from '@/components/common/EmptyState';
import {
  Search,
  Sparkles,
  FilePlus,
  Plus,
  X,
  Send,
  CheckCircle2,
  Building,
  Upload
} from 'lucide-react';

export default function HomePage() {
  const { posts, addPost, showToast } = useApp();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [feedSearch, setFeedSearch] = useState('');

  // Requirement Modal State - just message description
  const [reqModalOpen, setReqModalOpen] = useState(false);
  const [reqDescription, setReqDescription] = useState('');
  const [reqImageUrl, setReqImageUrl] = useState('');

  const handlePublishRequirement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqDescription.trim()) {
      showToast('Please enter your requirement description.', 'error');
      return;
    }

    const trimmed = reqDescription.trim();
    const firstLine = trimmed.split('\n')[0];
    const previewTitle = firstLine.length > 55 ? firstLine.slice(0, 55) + '...' : firstLine;

    addPost({
      postType: 'offer',
      offerTag: 'BUYER REQUIREMENT',
      content: `📌 BUYER REQUIREMENT\n\n${trimmed}`,
      attachedProduct: {
        id: `req-${Date.now()}`,
        title: previewTitle,
        price: 0,
        image: reqImageUrl.trim() || 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop&q=80',
        moq: 1,
        unit: 'Units',
      },
      images: reqImageUrl.trim() ? [reqImageUrl.trim()] : undefined,
    });

    // Reset & close
    setReqDescription('');
    setReqImageUrl('');
    setReqModalOpen(false);

    showToast('Your requirement is published! Verified sellers will send you quotes.', 'success');
  };

  // Filter posts based on search and category
  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.content.toLowerCase().includes(feedSearch.toLowerCase()) ||
      post.businessName.toLowerCase().includes(feedSearch.toLowerCase()) ||
      post.location.toLowerCase().includes(feedSearch.toLowerCase()) ||
      (post.attachedProduct?.title.toLowerCase().includes(feedSearch.toLowerCase()) ?? false) ||
      (post.attachedService?.title.toLowerCase().includes(feedSearch.toLowerCase()) ?? false);

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
    <div className="flex gap-6 items-start justify-center pb-12">
      {/* Center: Social-Business Feed */}
      <div className="flex-1 max-w-2xl min-w-0 space-y-4">
        {/* In-feed quick search */}
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

        {/* Post a Requirement Banner Button */}
        <div className="bg-[#0F172A] border border-gray-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2E3192] flex items-center justify-center shrink-0">
              <FilePlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold">Looking to Buy or Source Products?</p>
              <p className="text-xs text-gray-400">
                Post your requirement · Verified manufacturers & traders will contact you
              </p>
            </div>
          </div>
          <button
            onClick={() => setReqModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#2E3192] hover:bg-[#242775] text-white text-xs font-bold transition-all shadow-xs shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Post a Requirement</span>
          </button>
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

      {/* Post a Requirement Modal */}
      {reqModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-[#111111]">Post a Buyer Requirement</h2>
                <p className="text-xs text-[#667085]">
                  Sellers on Supporters will see this and reach out with quotes
                </p>
              </div>
              <button
                onClick={() => setReqModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePublishRequirement} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-[#111111] block mb-1.5">
                  Message Description *
                </label>
                <textarea
                  value={reqDescription}
                  onChange={(e) => setReqDescription(e.target.value)}
                  rows={5}
                  placeholder="Type what product, material, or service you are looking to buy, quantity needed, target budget or location (e.g. Need 500 meters of raw cotton fabric 280 GSM delivered to Surat with target price ₹120/meter)..."
                  className="w-full px-3.5 py-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus:bg-white focus:border-[#2E3192] outline-none resize-none leading-relaxed"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-[#111111] block mb-1">
                  Sample Image URL (Optional)
                </label>
                <input
                  type="text"
                  value={reqImageUrl}
                  onChange={(e) => setReqImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus:bg-white focus:border-[#2E3192] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setReqModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-[#667085] hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#2E3192] hover:bg-[#242775] text-white text-xs font-bold transition-colors shadow-2xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Publish Requirement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
