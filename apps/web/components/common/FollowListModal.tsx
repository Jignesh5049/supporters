'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { Avatar } from '@/components/common/Avatar';
import {
  X,
  Search,
  MessageSquare,
  CheckCircle2,
  Users,
  Building2,
  MapPin,
  Sparkles,
} from 'lucide-react';

export interface FollowListItem {
  id: string;
  name: string;
  username?: string;
  avatar: string;
  verified?: boolean;
  category?: string;
  city?: string;
  businessType?: string;
  isFollowed?: boolean;
}

interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: 'Followers' | 'Following';
  subtitle?: string;
  items: FollowListItem[];
  onToggleFollow?: (id: string) => void;
}

export function FollowListModal({
  isOpen,
  onClose,
  title,
  subtitle,
  items,
  onToggleFollow,
}: FollowListModalProps) {
  const { openConversationWithBusiness, toggleFollowBusiness, followedBusinessIds } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.username && item.username.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.city && item.city.toLowerCase().includes(q)),
    );
  }, [items, searchQuery]);

  if (!isOpen) return null;

  const handleMessage = (businessId: string) => {
    onClose();
    openConversationWithBusiness(businessId);
  };

  const handleToggle = (id: string) => {
    if (onToggleFollow) {
      onToggleFollow(id);
    } else {
      toggleFollowBusiness(id);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[85vh] z-10 animate-in zoom-in-95 duration-200">
        {/* Instagram-style Header */}
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-white shrink-0">
          <div className="flex-1 pr-2">
            <h2 className="text-base sm:text-lg font-black text-[#111111] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#2E3192]" />
              <span>{title}</span>
            </h2>
            {subtitle && <p className="text-xs text-[#667085] mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-2.5 bg-[#F7F8FC] border-b border-[#E5E7EB] shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-[#667085] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${title.toLowerCase()}...`}
              className="w-full pl-9 pr-8 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs text-[#111111] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2E3192] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Followers / Following List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 divide-y divide-gray-100 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#667085]">
              <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="font-semibold text-gray-700">No {title.toLowerCase()} found</p>
              {searchQuery && (
                <p className="mt-1 text-gray-400">
                  No results matching &ldquo;{searchQuery}&rdquo;
                </p>
              )}
            </div>
          ) : (
            filteredItems.map((item) => {
              const isCurrentlyFollowing = item.isFollowed ?? followedBusinessIds.includes(item.id);

              return (
                <div
                  key={item.id}
                  className="pt-3 pb-3 first:pt-1 last:pb-1 flex items-center justify-between gap-3 hover:bg-gray-50/70 p-2 rounded-xl transition-colors"
                >
                  {/* Left: Avatar & Info */}
                  <Link
                    href={`/business/${item.id}`}
                    onClick={onClose}
                    className="flex items-center gap-3 min-w-0 flex-1 group"
                  >
                    <Avatar src={item.avatar} name={item.name} size="md" verified={item.verified} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-bold text-[#111111] group-hover:text-[#2E3192] truncate transition-colors">
                          {item.name}
                        </span>
                        {item.verified && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#00AEEF] fill-[#00AEEF]/20 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-[#667085] truncate">
                        {item.category || item.businessType || 'B2B Enterprise'}
                        {item.city ? ` · ${item.city}` : ''}
                      </p>
                      {item.username && (
                        <p className="text-[10px] text-gray-400 truncate">@{item.username}</p>
                      )}
                    </div>
                  </Link>

                  {/* Right Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMessage(item.id)}
                      className="p-2 text-[#2E3192] bg-blue-50/80 hover:bg-blue-100 rounded-xl transition-colors"
                      title={`Message ${item.name}`}
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggle(item.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isCurrentlyFollowing
                          ? 'bg-gray-100 text-gray-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 border border-gray-200'
                          : 'bg-[#2E3192] text-white hover:bg-[#242775] shadow-2xs'
                      }`}
                    >
                      {isCurrentlyFollowing ? 'Following' : '+ Follow'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#E5E7EB] bg-[#F7F8FC] flex items-center justify-between text-[11px] text-[#667085] shrink-0">
          <span>{filteredItems.length} accounts listed</span>
          <button onClick={onClose} className="font-bold text-[#2E3192] hover:underline">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
