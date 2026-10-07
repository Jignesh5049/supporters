'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Business } from '@/types';
import { useApp } from '@/context/AppContext';
import { Avatar } from '@/components/common/Avatar';
import { Bookmark, MapPin, Star, Users, ArrowRight } from 'lucide-react';

interface BusinessCardProps {
  business: Business;
}

export function BusinessCard({ business }: BusinessCardProps) {
  const {
    savedBusinessIds,
    toggleSaveBusiness,
    followedBusinessIds,
    toggleFollowBusiness
  } = useApp();

  const isSaved = savedBusinessIds.includes(business.id);
  const isFollowing = followedBusinessIds.includes(business.id);

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-2xs hover:shadow-xs transition-all flex flex-col group">
      {/* Cover Banner */}
      <div className="relative h-28 w-full bg-gray-100 overflow-hidden">
        <Image
          src={business.coverImage}
          alt={business.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        {/* Save Bookmark */}
        <button
          onClick={(e) => {
            e.preventDefault();
            toggleSaveBusiness(business.id);
          }}
          className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-xs transition-colors shadow-xs ${
            isSaved
              ? 'bg-[#2E3192] text-white'
              : 'bg-white/85 text-[#111111] hover:bg-white'
          }`}
          aria-label={isSaved ? 'Remove from saved' : 'Save business'}
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
        </button>

        <span className="absolute bottom-2 left-3 text-[11px] font-bold text-white uppercase tracking-wider bg-black/40 px-2 py-0.5 rounded backdrop-blur-xs">
          {business.businessType}
        </span>
      </div>

      {/* Body with overlapping avatar */}
      <div className="p-4 pt-0 flex flex-col flex-1 relative">
        <div className="flex items-end justify-between -mt-6 mb-3">
          <Avatar
            src={business.avatar}
            name={business.name}
            size="lg"
            verified={business.verified}
            className="ring-4 ring-white shadow-sm"
          />

          <button
            onClick={() => toggleFollowBusiness(business.id)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
              isFollowing
                ? 'bg-gray-100 text-[#667085] hover:bg-gray-200'
                : 'bg-[#2E3192] text-white hover:bg-[#242775] shadow-xs'
            }`}
          >
            {isFollowing ? 'Following' : '+ Follow'}
          </button>
        </div>

        {/* Name and details */}
        <Link href={`/business/${business.id}`}>
          <h3 className="text-sm font-bold text-[#111111] group-hover:text-[#2E3192] transition-colors truncate">
            {business.name}
          </h3>
        </Link>

        <div className="flex items-center gap-2 text-xs text-[#667085] mt-1">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            <span>{business.city}, {business.state}</span>
          </span>
          <span>·</span>
          <span>Est. {business.establishedYear}</span>
        </div>

        <p className="text-xs text-[#667085] line-clamp-2 mt-2 leading-relaxed">
          {business.about}
        </p>

        {/* Stats */}
        <div className="mt-auto pt-3 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-[#667085]">
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-[#2E3192]" />
            <span className="font-semibold text-[#111111]">
              {business.followersCount.toLocaleString('en-IN')}
            </span>
            <span>supporters</span>
          </div>

          <div className="flex items-center gap-1 font-bold text-[#111111]">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{business.rating}</span>
            <span className="text-[11px] text-[#667085] font-normal">({business.reviewCount})</span>
          </div>
        </div>

        {/* Profile Link */}
        <div className="mt-3 pt-2">
          <Link
            href={`/business/${business.id}`}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-center text-xs font-semibold text-[#2E3192] bg-[#F7F8FC] hover:bg-blue-50/70 border border-[#E5E7EB] rounded-xl transition-colors"
          >
            <span>View Business Profile</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
