'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import { Avatar } from '@/components/common/Avatar';
import { ProductCard } from '@/components/product/ProductCard';
import { ServiceCard } from '@/components/service/ServiceCard';
import { BusinessCard } from '@/components/business/BusinessCard';
import { FeedPostCard } from '@/components/feed/FeedPostCard';
import { EmptyState } from '@/components/common/EmptyState';
import { Bookmark, Package, Building2, Wrench, Sparkles, MapPin, Trash2 } from 'lucide-react';

export default function SavedPage() {
  const {
    products,
    businesses,
    services,
    posts,
    savedProductIds,
    savedBusinessIds,
    savedServiceIds,
    savedPostIds,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'products' | 'businesses' | 'services' | 'posts'>(
    'products',
  );

  const savedProducts = products.filter((p) => savedProductIds.includes(p.id));
  const savedBusinesses = businesses.filter((b) => savedBusinessIds.includes(b.id));
  const savedServices = services.filter((s) => savedServiceIds.includes(s.id));
  const savedPosts = posts.filter((p) => savedPostIds.includes(p.id));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2E3192]/10 text-[#2E3192] flex items-center justify-center">
            <Bookmark className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#111111]">Saved Collection</h1>
            <p className="text-xs text-[#667085]">
              Quickly revisit bookmarked products, prospective suppliers, and insightful feed posts.
            </p>
          </div>
        </div>

        {/* Saved Tabs */}
        <div className="flex items-center gap-2 mt-6 border-b border-[#E5E7EB] overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'products'
                ? 'border-[#2E3192] text-[#2E3192]'
                : 'border-transparent text-[#667085] hover:text-[#111111]'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Products ({savedProducts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('businesses')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'businesses'
                ? 'border-[#2E3192] text-[#2E3192]'
                : 'border-transparent text-[#667085] hover:text-[#111111]'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Businesses ({savedBusinesses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('services')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'services'
                ? 'border-[#00AEEF] text-[#00AEEF]'
                : 'border-transparent text-[#667085] hover:text-[#111111]'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Services ({savedServices.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('posts')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'posts'
                ? 'border-[#2E3192] text-[#2E3192]'
                : 'border-transparent text-[#667085] hover:text-[#111111]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Posts ({savedPosts.length})</span>
          </button>
        </div>
      </div>

      {/* Tab Panes */}
      <div>
        {activeTab === 'products' &&
          (savedProducts.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No saved products yet"
              description="Save products while browsing the feed or discover page to find them here."
              actionLabel="Explore Products"
              actionHref="/discover?tab=products"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {savedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ))}

        {activeTab === 'businesses' &&
          (savedBusinesses.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No saved businesses yet"
              description="Bookmark manufacturers and regional suppliers to access their updates anytime."
              actionLabel="Discover Businesses"
              actionHref="/discover?tab=businesses"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {savedBusinesses.map((b) => (
                <BusinessCard key={b.id} business={b} />
              ))}
            </div>
          ))}

        {activeTab === 'services' &&
          (savedServices.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="No saved services yet"
              description="Save specialized industrial or tech services for your future requirements."
              actionLabel="Browse Services"
              actionHref="/discover?tab=services"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {savedServices.map((s) => (
                <ServiceCard key={s.id} service={s} />
              ))}
            </div>
          ))}

        {activeTab === 'posts' &&
          (savedPosts.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No saved posts yet"
              description="Save industry news, wholesale offers, and product launches to read later."
              actionLabel="Go to Social Feed"
              actionHref="/"
            />
          ) : (
            <div className="max-w-2xl mx-auto space-y-4">
              {savedPosts.map((post) => (
                <FeedPostCard key={post.id} post={post} />
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}
