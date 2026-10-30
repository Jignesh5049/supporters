'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import { CURRENT_USER, MOCK_REVIEWS } from '@/lib/mock-data';
import { Avatar } from '@/components/common/Avatar';
import { FeedPostCard } from '@/components/feed/FeedPostCard';
import { ProductCard } from '@/components/product/ProductCard';
import { ServiceCard } from '@/components/service/ServiceCard';
import { EmptyState } from '@/components/common/EmptyState';
import { FollowListModal } from '@/components/common/FollowListModal';
import {
  MapPin,
  Calendar,
  Building,
  Users,
  Bookmark,
  Sparkles,
  FileQuestion,
  Star,
  Settings,
  Edit3,
  ExternalLink,
  Package,
  Wrench,
} from 'lucide-react';

export default function ProfilePage() {
  const { posts, products, services, savedProductIds, savedPostIds, businesses } = useApp();

  const [activeTab, setActiveTab] = useState<
    'posts' | 'business' | 'saved' | 'enquiries' | 'reviews'
  >('posts');
  const [showFollowingModal, setShowFollowingModal] = useState(false);

  const myPosts = posts.filter((p) => p.businessId === CURRENT_USER.businessId);
  const myBusiness = businesses.find((b) => b.id === CURRENT_USER.businessId);
  const myProducts = products.filter((p) => p.businessId === CURRENT_USER.businessId);
  const myServices = services.filter((s) => s.businessId === CURRENT_USER.businessId);
  const mySavedProducts = products.filter((p) => savedProductIds.includes(p.id));

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Profile Header Box */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-2xs">
        {/* Cover Photo */}
        <div className="relative h-44 sm:h-52 w-full bg-gradient-to-r from-[#2E3192] to-[#00AEEF]">
          <Image
            src={CURRENT_USER.coverImage}
            alt="Cover"
            fill
            className="object-cover opacity-80"
            priority
            unoptimized
          />
        </div>

        {/* Profile Card Body */}
        <div className="px-6 sm:px-8 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="-mt-14 sm:-mt-16 shrink-0">
                <Avatar
                  src={CURRENT_USER.avatar}
                  name={CURRENT_USER.name}
                  size="xl"
                  verified
                  className="ring-4 ring-white shadow-md bg-white"
                />
              </div>
              <div className="space-y-0.5 pt-1 sm:pt-0 sm:pb-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-[#111111]">
                    {CURRENT_USER.name}
                  </h1>
                  <span className="text-xs font-semibold text-[#2E3192] bg-[#2E3192]/10 px-2 py-0.5 rounded-full">
                    Verified Buyer
                  </span>
                </div>
                <p className="text-xs text-[#667085]">@{CURRENT_USER.username}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 sm:pb-1">
              <Link
                href="/settings"
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#111111] bg-[#F7F8FC] hover:bg-gray-100 border border-[#E5E7EB] rounded-xl transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Account Settings</span>
              </Link>
              <Link
                href="/create"
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#2E3192] hover:bg-[#242775] rounded-xl transition-colors shadow-2xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Create Post</span>
              </Link>
            </div>
          </div>

          {/* Bio & Details */}
          <p className="text-xs sm:text-sm text-[#111111] leading-relaxed max-w-2xl">
            {CURRENT_USER.bio}
          </p>

          <div className="flex items-center gap-5 mt-3 text-xs text-[#667085] flex-wrap">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#2E3192]" />
              {CURRENT_USER.city}, {CURRENT_USER.state}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Member since {CURRENT_USER.memberSince}
            </span>
            <span className="flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-[#00AEEF]" />1 Registered Business
            </span>
          </div>

          {/* Social Counts - Followers removed, only Following and Businesses */}
          <div className="flex items-center gap-6 mt-4 pt-3 border-t border-[#E5E7EB] text-xs">
            <button
              type="button"
              onClick={() => setShowFollowingModal(true)}
              className="flex items-center gap-1.5 hover:text-[#2E3192] transition-colors cursor-pointer group text-left"
            >
              <span className="font-extrabold text-[#111111] group-hover:text-[#2E3192] underline decoration-dotted decoration-gray-300">
                {CURRENT_USER.followingCount}
              </span>
              <span className="text-[#667085] group-hover:text-[#2E3192]">Following</span>
            </button>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-[#111111]">{CURRENT_USER.businessesCount}</span>
              <span className="text-[#667085]">Businesses</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 sm:px-8 border-t border-[#E5E7EB] bg-[#F7F8FC] flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'posts', label: `My Updates (${myPosts.length})` },
            { id: 'business', label: 'My Business Portal' },
            { id: 'saved', label: `Saved (${mySavedProducts.length})` },
            { id: 'enquiries', label: 'My Enquiries' },
            { id: 'reviews', label: 'Reviews & Ratings' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'border-[#2E3192] text-[#2E3192] bg-white'
                  : 'border-transparent text-[#667085] hover:text-[#111111]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Panes */}
      <div>
        {/* POSTS TAB */}
        {activeTab === 'posts' && (
          <div className="space-y-4">
            {myPosts.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="No updates posted yet"
                description="Share product arrivals, manufacturing updates, or special offers with the Supporters community."
                actionLabel="Create First Post"
                actionHref="/create"
              />
            ) : (
              myPosts.map((p) => <FeedPostCard key={p.id} post={p} />)
            )}
          </div>
        )}

        {/* BUSINESS PORTAL TAB */}
        {activeTab === 'business' && myBusiness && (
          <div className="space-y-6">
            <div className="p-5 bg-white border border-[#E5E7EB] rounded-2xl shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Avatar
                  src={myBusiness.avatar}
                  name={myBusiness.name}
                  size="lg"
                  verified={myBusiness.verified}
                />
                <div>
                  <h3 className="text-base font-bold text-[#111111]">{myBusiness.name}</h3>
                  <p className="text-xs text-[#667085]">
                    {myBusiness.category} · {myBusiness.city}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/business/${myBusiness.id}`}
                  className="px-3 py-1.5 text-xs font-semibold text-[#2E3192] bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                >
                  Public Profile
                </Link>
                <Link
                  href="/business/manage"
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#2E3192] hover:bg-[#242775] rounded-xl transition-colors shadow-2xs"
                >
                  Manage Business Suite
                </Link>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[#111111]">
                My Listed Products ({myProducts.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {myProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SAVED TAB */}
        {activeTab === 'saved' && (
          <div className="space-y-4">
            {mySavedProducts.length === 0 ? (
              <EmptyState
                icon={Bookmark}
                title="No saved items yet"
                description="Save products to quickly access them here."
                actionLabel="Explore Products"
                actionHref="/discover"
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {mySavedProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ENQUIRIES TAB */}
        {activeTab === 'enquiries' && (
          <div className="space-y-4">
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                <div className="flex items-center gap-2">
                  <FileQuestion className="w-4 h-4 text-[#2E3192]" />
                  <span className="text-sm font-bold text-[#111111]">Active Trade Inquiries</span>
                </div>
                <Link
                  href="/messages"
                  className="text-xs font-semibold text-[#00AEEF] hover:underline"
                >
                  Go to Messages
                </Link>
              </div>

              <div className="p-3 rounded-xl bg-[#F7F8FC] border border-[#E5E7EB] flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#111111]">Smart LED TV 55-Inch 4K UHD</h4>
                  <p className="text-[11px] text-[#667085]">
                    Supplier: Shree Electronics · Qty: 25 Units
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                  Quotation Received
                </span>
              </div>
            </div>
          </div>
        )}

        {/* REVIEWS TAB */}
        {activeTab === 'reviews' && (
          <div className="space-y-4">
            {MOCK_REVIEWS.map((r) => (
              <div
                key={r.id}
                className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar src={r.authorAvatar} name={r.authorName} size="xs" />
                    <span className="text-xs font-bold text-[#111111]">{r.authorName}</span>
                  </div>
                  <span className="text-[11px] text-[#667085]">{r.date}</span>
                </div>
                <p className="text-xs text-[#667085]">{r.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instagram-style Following Modal */}
      <FollowListModal
        isOpen={showFollowingModal}
        onClose={() => setShowFollowingModal(false)}
        title="Following"
        subtitle={`${CURRENT_USER.name} · ${CURRENT_USER.followingCount} Following`}
        items={businesses.map((b) => ({
          id: b.id,
          name: b.name,
          username: b.slug,
          avatar: b.avatar,
          verified: b.verified,
          category: b.category,
          city: b.city,
          businessType: b.businessType,
          isFollowed: true,
        }))}
      />
    </div>
  );
}
