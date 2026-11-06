'use client';

import React from 'react';
import Link from 'next/link';
import { Business } from '@/types';
import { useApp } from '@/context/AppContext';
import {
  BusinessCard as PatternBusinessCard,
  type BusinessCardData,
} from '@supporters/ui-web/patterns/business-card';

interface BusinessCardProps {
  business: Business;
}

export function BusinessCard({ business }: BusinessCardProps) {
  const { savedBusinessIds, toggleSaveBusiness, followedBusinessIds, toggleFollowBusiness } =
    useApp();

  const isSaved = savedBusinessIds.includes(business.id);
  const isFollowing = followedBusinessIds.includes(business.id);

  const cardData: BusinessCardData = {
    id: business.id,
    name: business.name,
    slug: business.slug,
    coverImage: business.coverImage,
    avatar: business.avatar,
    businessType: business.businessType,
    verified: business.verified,
    city: business.city,
    state: business.state,
    establishedYear: business.establishedYear,
    about: business.about,
    followersCount: business.followersCount,
    rating: business.rating,
    reviewsCount: business.reviewCount,
  };

  return (
    <PatternBusinessCard
      business={cardData}
      isSaved={isSaved}
      isFollowing={isFollowing}
      onToggleSave={toggleSaveBusiness}
      onToggleFollow={toggleFollowBusiness}
      renderLink={({ href, className, children }) => (
        <Link href={href} className={className}>
          {children}
        </Link>
      )}
    />
  );
}
