'use client';

import React from 'react';
import Link from 'next/link';
import { FeedPost } from '@/types';
import { useApp } from '@/context/AppContext';
import {
  FeedPostCard as PatternFeedPostCard,
  type FeedPostCardData,
} from '@supporters/ui-web/patterns/feed-post-card';

interface FeedPostCardProps {
  post: FeedPost;
}

export function FeedPostCard({ post }: FeedPostCardProps) {
  const {
    likedPostIds,
    toggleLikePost,
    savedPostIds,
    toggleSavePost,
    openConversationWithBusiness,
    openEnquiryModal,
    showToast,
  } = useApp();

  const isLiked = likedPostIds.includes(post.id);
  const isSaved = savedPostIds.includes(post.id);

  const cardData: FeedPostCardData = {
    id: post.id,
    businessId: post.businessId,
    businessName: post.businessName,
    businessAvatar: post.businessAvatar,
    businessVerified: post.businessVerified,
    location: post.location,
    createdAt: post.createdAt,
    content: post.content,
    images: post.images,
    likesCount: post.likesCount,
    commentsCount: post.commentsCount,
    tags: post.offerTag ? [post.offerTag] : undefined,
    attachedProduct: post.attachedProduct
      ? {
          id: post.attachedProduct.id,
          title: post.attachedProduct.title,
          price: post.attachedProduct.price,
          image: post.attachedProduct.image,
          minOrderQuantity: post.attachedProduct.moq,
          unit: post.attachedProduct.unit,
        }
      : undefined,
    attachedService: post.attachedService
      ? {
          id: post.attachedService.id,
          title: post.attachedService.title,
          startingPrice: post.attachedService.startingPrice,
          image: post.attachedService.image,
        }
      : undefined,
  };

  return (
    <PatternFeedPostCard
      post={cardData}
      isLiked={isLiked}
      isSaved={isSaved}
      onToggleLike={toggleLikePost}
      onToggleSave={toggleSavePost}
      onShare={() => {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          navigator.clipboard.writeText(
            `${window.location.origin}/business/${post.businessId}?post=${post.id}`,
          );
          showToast('Post link copied to clipboard!', 'success');
        }
      }}
      onEnquire={() => {
        openEnquiryModal({
          title: `Enquiry about post`,
          businessName: post.businessName,
          businessId: post.businessId,
        });
      }}
      onOpenComments={() => {
        openConversationWithBusiness(post.businessId, {
          initialMessage: `Hi, inquiring regarding your post: "${post.content.slice(0, 60)}..."`,
        });
      }}
      renderLink={({ href, className, children }) => (
        <Link href={href} className={className}>
          {children}
        </Link>
      )}
    />
  );
}
