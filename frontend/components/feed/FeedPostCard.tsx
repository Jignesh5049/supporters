'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FeedPost } from '@/types';
import { useApp } from '@/context/AppContext';
import { Avatar } from '@/components/common/Avatar';
import { ShareModal } from '@/components/common/ShareModal';
import {
  ThumbsUp,
  MessageSquare,
  Share2,
  Bookmark,
  MoreHorizontal,
  MapPin,
  Clock,
  ArrowRight,
  Send,
  Sparkles,
  Tag
} from 'lucide-react';

interface FeedPostCardProps {
  post: FeedPost;
}

export function FeedPostCard({ post }: FeedPostCardProps) {
  const {
    likedPostIds,
    toggleLikePost,
    savedPostIds,
    toggleSavePost,
    openEnquiryModal,
    showToast
  } = useApp();

  const isLiked = likedPostIds.includes(post.id);
  const isSaved = savedPostIds.includes(post.id);

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentsList, setCommentsList] = useState<Array<{ id: string; user: string; text: string; time: string }>>([
    {
      id: 'c-1',
      user: 'Mehul Patel (Vadodara)',
      text: 'What is the lead time for 20 units shipped to GIDC Makarpura?',
      time: '1h ago'
    }
  ]);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setCommentsList((prev) => [
      ...prev,
      {
        id: `c-${Date.now()}`,
        user: 'Aarav Mehta (You)',
        text: commentText.trim(),
        time: 'Just now'
      }
    ]);
    setCommentText('');
    showToast('Comment published', 'info');
  };

  const hasAttachedItem = post.attachedProduct || post.attachedService;

  return (
    <>
      <article className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-2xs transition-all hover:shadow-xs">
        {/* Post Header */}
        <div className="p-4 sm:p-5 pb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href={`/business/${post.businessId}`}>
              <Avatar
                src={post.businessAvatar}
                name={post.businessName}
                size="md"
                verified={post.businessVerified}
              />
            </Link>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link
                  href={`/business/${post.businessId}`}
                  className="text-sm font-bold text-[#111111] hover:text-[#2E3192] transition-colors truncate"
                >
                  {post.businessName}
                </Link>
                {post.businessVerified && (
                  <span className="inline-flex items-center text-[11px] font-semibold text-[#00AEEF]">
                    ✓ Verified
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-[#667085] mt-0.5">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#667085]" />
                  <span>{post.location}</span>
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#667085]" />
                  <span>{post.createdAt}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right Menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 text-[#667085] hover:text-[#111111] hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Post actions"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-1 w-44 bg-white border border-[#E5E7EB] rounded-xl shadow-lg z-40 py-1 text-xs text-[#111111]">
                  <button
                    onClick={() => {
                      toggleSavePost(post.id);
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-[#F7F8FC]"
                  >
                    {isSaved ? 'Remove from Saved' : 'Save Post'}
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.origin + `/business/${post.businessId}`);
                      showToast('Link copied to clipboard', 'success');
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-[#F7F8FC]"
                  >
                    Copy Link
                  </button>
                  <button
                    onClick={() => {
                      showToast('Post reported for review', 'info');
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50"
                  >
                    Report Post
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Offer Tag Highlight if present */}
        {post.offerTag && (
          <div className="mx-4 sm:mx-5 mb-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#A3238E]/10 text-[#A3238E] text-xs font-bold tracking-wide">
            <Tag className="w-3.5 h-3.5" />
            <span>{post.offerTag}</span>
          </div>
        )}

        {/* Post Text Content */}
        <div className="px-4 sm:px-5 pb-3">
          <p className="text-sm text-[#111111] leading-relaxed whitespace-pre-line">
            {post.content}
          </p>
        </div>

        {/* Primary Image / Media if present */}
        {post.images && post.images.length > 0 && (
          <div className="w-full relative aspect-16/9 bg-gray-100 overflow-hidden border-y border-[#E5E7EB]">
            <Image
              src={post.images[0]}
              alt={post.attachedProduct?.title || post.businessName}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}

        {/* Attached Product or Service Snippet Box */}
        {hasAttachedItem && (
          <div className="m-4 sm:m-5 p-3.5 rounded-xl bg-[#F7F8FC] border border-[#E5E7EB] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {post.attachedProduct?.image && (
                <div className="w-12 h-12 rounded-lg overflow-hidden relative bg-white shrink-0 border border-[#E5E7EB]">
                  <Image
                    src={post.attachedProduct.image}
                    alt={post.attachedProduct.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}
              {post.attachedService?.image && (
                <div className="w-12 h-12 rounded-lg overflow-hidden relative bg-white shrink-0 border border-[#E5E7EB]">
                  <Image
                    src={post.attachedService.image}
                    alt={post.attachedService.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-[#111111] line-clamp-1">
                  {post.attachedProduct?.title || post.attachedService?.title}
                </h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-extrabold text-[#2E3192]">
                    Starting from ₹{((post.attachedProduct?.price || post.attachedService?.startingPrice) || 0).toLocaleString('en-IN')}
                  </span>
                  {post.attachedProduct?.moq && (
                    <span className="text-[11px] text-[#667085]">
                      (MOQ: {post.attachedProduct.moq} {post.attachedProduct.unit || 'Units'})
                    </span>
                  )}
                  {post.attachedService?.unit && (
                    <span className="text-[11px] text-[#667085]">
                      ({post.attachedService.unit})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* CTA action buttons inside card */}
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              {post.attachedProduct && (
                <Link
                  href={`/product/${post.attachedProduct.id}`}
                  className="flex-1 sm:flex-initial text-center px-3 py-1.5 text-xs font-semibold text-[#2E3192] bg-white hover:bg-gray-50 border border-[#2E3192]/30 rounded-lg transition-colors"
                >
                  View Product
                </Link>
              )}
              {post.attachedService && (
                <Link
                  href={`/service/${post.attachedService.id}`}
                  className="flex-1 sm:flex-initial text-center px-3 py-1.5 text-xs font-semibold text-[#00AEEF] bg-white hover:bg-gray-50 border border-[#00AEEF]/40 rounded-lg transition-colors"
                >
                  View Service
                </Link>
              )}

              <button
                type="button"
                onClick={() =>
                  openEnquiryModal({
                    title: post.attachedProduct?.title || post.attachedService?.title || 'Business Quotation',
                    businessName: post.businessName,
                    businessId: post.businessId
                  })
                }
                className="flex-1 sm:flex-initial text-center px-3 py-1.5 text-xs font-semibold text-white bg-[#2E3192] hover:bg-[#242775] rounded-lg transition-colors shadow-2xs"
              >
                Contact Supplier
              </button>
            </div>
          </div>
        )}

        {/* Social Counters */}
        <div className="px-4 sm:px-5 py-2 flex items-center justify-between text-xs text-[#667085] border-t border-[#E5E7EB]">
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-[#2E3192] text-white flex items-center justify-center text-[10px]">
              👍
            </span>
            <span>{post.likesCount}</span>
          </div>

          <div className="flex items-center gap-3">
            <span>{commentsList.length + post.commentsCount} comments</span>
            <span>·</span>
            <span>{post.sharesCount} shares</span>
          </div>
        </div>

        {/* Social Action Bar: Like, Comment, Share, Save */}
        <div className="px-2 sm:px-4 py-1.5 border-t border-[#E5E7EB] flex items-center justify-between">
          <button
            onClick={() => toggleLikePost(post.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-colors ${
              isLiked ? 'text-[#2E3192] bg-blue-50/60' : 'text-[#667085] hover:bg-[#F7F8FC] hover:text-[#111111]'
            }`}
          >
            <ThumbsUp className={`w-4 h-4 ${isLiked ? 'fill-current text-[#2E3192]' : ''}`} />
            <span>Like</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-[#667085] hover:bg-[#F7F8FC] hover:text-[#111111] transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Comment</span>
          </button>

          <button
            onClick={() => setShareModalOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-[#667085] hover:bg-[#F7F8FC] hover:text-[#111111] transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>

          <button
            onClick={() => toggleSavePost(post.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-colors ${
              isSaved ? 'text-[#2E3192] bg-blue-50/60' : 'text-[#667085] hover:bg-[#F7F8FC] hover:text-[#111111]'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current text-[#2E3192]' : ''}`} />
            <span>Save</span>
          </button>
        </div>

        {/* Expanded Comments Thread */}
        {showComments && (
          <div className="bg-[#F7F8FC] p-4 border-t border-[#E5E7EB] space-y-3 animate-in fade-in duration-150">
            {commentsList.map((c) => (
              <div key={c.id} className="bg-white p-3 rounded-xl border border-[#E5E7EB] text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[#111111]">{c.user}</span>
                  <span className="text-[11px] text-[#667085]">{c.time}</span>
                </div>
                <p className="text-[#111111] leading-relaxed">{c.text}</p>
              </div>
            ))}

            <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a public enquiry or comment..."
                className="flex-1 px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#2E3192]"
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="p-2 bg-[#2E3192] text-white rounded-xl disabled:opacity-50 hover:bg-[#242775] transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </article>

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        title={`${post.businessName}: "${post.content.slice(0, 80)}..."`}
        url={typeof window !== 'undefined' ? `${window.location.origin}/business/${post.businessId}` : ''}
      />
    </>
  );
}
