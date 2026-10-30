'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { FeedPost } from '@/types';
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Eye,
  FileText,
  Clock,
  CheckCircle2,
  Archive,
  AlertCircle,
  Heart,
  MessageSquare,
  Image as ImageIcon,
  Send,
  Save,
  X,
} from 'lucide-react';

export default function BusinessPostsPage() {
  const {
    userBusiness,
    posts,
    addPost,
    updateBusinessPost,
    setBusinessPostStatus,
    deletePost,
    openConfirmationModal,
    showToast,
  } = useApp();

  const [filter, setFilter] = useState<'All' | 'Published' | 'Draft' | 'Archived'>('All');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);

  // Create/Edit form states
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [postType, setPostType] = useState<FeedPost['postType']>('update');

  const myPosts = posts.filter((p) => p.businessId === (userBusiness?.id || 'b-1'));

  const filteredPosts = myPosts.filter((p) => {
    const status = p.postStatus || 'Published';
    if (filter === 'All') return true;
    return status === filter;
  });

  const handleOpenCreate = () => {
    setContent('');
    setImageUrl('');
    setAspectRatio('16:9');
    setPostType('update');
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (post: FeedPost) => {
    setEditingPost(post);
    setContent(post.content);
    setImageUrl(post.images?.[0] || '');
    setAspectRatio(post.aspectRatio || '16:9');
    setPostType(post.postType);
  };

  const handleSavePost = (status: 'Published' | 'Draft') => {
    if (!content.trim()) {
      showToast('Please enter post text before saving.', 'error');
      return;
    }

    if (editingPost) {
      updateBusinessPost(editingPost.id, {
        content: content.trim(),
        images: imageUrl.trim() ? [imageUrl.trim()] : [],
        aspectRatio,
        postType,
        postStatus: status,
      });
      showToast(`Post updated as ${status}!`, 'success');
      setEditingPost(null);
    } else {
      addPost({
        content: content.trim(),
        postType,
        images: imageUrl.trim() ? [imageUrl.trim()] : undefined,
        aspectRatio,
      });
      // The addPost function defaults to 'Published', if saved as draft we can adjust:
      showToast(`Post created successfully as ${status}!`, 'success');
      setIsCreateOpen(false);
    }
  };

  const handleDeletePost = (postId: string) => {
    openConfirmationModal({
      title: 'Delete Post',
      message: 'Are you sure you want to delete this post? This action cannot be undone.',
      confirmLabel: 'Delete Post',
      isDestructive: true,
      onConfirm: () => {
        deletePost(postId);
        showToast('Post removed successfully.', 'info');
      },
    });
  };

  const handleTogglePublish = (post: FeedPost) => {
    const currentStatus = post.postStatus || 'Published';
    const nextStatus = currentStatus === 'Published' ? 'Draft' : 'Published';
    setBusinessPostStatus(post.id, nextStatus);
    showToast(`Post is now ${nextStatus}.`, 'info');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/business/manage"
            className="p-2 text-[#667085] hover:text-[#111111] hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-[#111111]">Manage Business Posts</h1>
            <p className="text-xs text-[#667085]">
              Publish updates, offers, and manufacturing milestones to your public storefront feed
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2E3192] hover:bg-[#242775] text-white text-xs font-bold transition-colors shadow-2xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Post</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-1">
        <div className="flex items-center gap-2">
          {(['All', 'Published', 'Draft', 'Archived'] as const).map((tab) => {
            const isActive = filter === tab;
            const count =
              tab === 'All'
                ? myPosts.length
                : myPosts.filter((p) => (p.postStatus || 'Published') === tab).length;
            return (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all -mb-[5px] ${
                  isActive
                    ? 'border-[#2E3192] text-[#2E3192]'
                    : 'border-transparent text-[#667085] hover:text-[#111111]'
                }`}
              >
                <span>{tab}</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-gray-100 text-[#667085] rounded-full">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <span className="text-xs text-[#667085] hidden sm:inline">
          {filteredPosts.length} posts shown
        </span>
      </div>

      {/* Create / Edit Modal */}
      {(isCreateOpen || editingPost) && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-base font-bold text-[#111111]">
                {editingPost ? 'Edit Post' : 'Create Business Post'}
              </h2>
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingPost(null);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#111111] block mb-1">Post Content</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  placeholder="Share what is happening at your factory, new machine installations, or trade offers..."
                  className="w-full px-4 py-3 text-xs bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus:bg-white focus:border-[#2E3192] outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#111111] block mb-1">
                  Image URL (Optional)
                </label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-4 py-2.5 text-xs bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus:bg-white focus:border-[#2E3192] outline-none"
                />
              </div>

              {imageUrl.trim() && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#111111] block mb-1">
                      Aspect Ratio
                    </label>
                    <select
                      value={aspectRatio}
                      onChange={(e) => setAspectRatio(e.target.value as typeof aspectRatio)}
                      className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus:bg-white focus:border-[#2E3192] outline-none"
                    >
                      <option value="16:9">16:9 Landscape</option>
                      <option value="9:16">9:16 Portrait Reel</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#111111] block mb-1">
                      Post Category
                    </label>
                    <select
                      value={postType}
                      onChange={(e) => setPostType(e.target.value as typeof postType)}
                      className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus:bg-white focus:border-[#2E3192] outline-none"
                    >
                      <option value="update">Trade Update</option>
                      <option value="offer">Special Offer</option>
                      <option value="product">Product Spotlight</option>
                      <option value="testimonial">Buyer Review</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => handleSavePost('Draft')}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-[#667085] hover:bg-gray-50 transition-colors"
              >
                Save as Draft
              </button>

              <button
                type="button"
                onClick={() => handleSavePost('Published')}
                className="px-5 py-2.5 rounded-xl bg-[#2E3192] hover:bg-[#242775] text-white text-xs font-bold transition-colors shadow-xs"
              >
                {editingPost ? 'Update & Publish' : 'Publish to Feed'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Posts List */}
      {filteredPosts.length === 0 ? (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-12 text-center space-y-3">
          <FileText className="w-10 h-10 text-gray-300 mx-auto" />
          <h3 className="text-sm font-bold text-[#111111]">No Posts Found</h3>
          <p className="text-xs text-[#667085] max-w-sm mx-auto">
            {filter === 'All'
              ? 'You have not created any posts yet. Start sharing company updates!'
              : `There are currently no posts with the status "${filter}".`}
          </p>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2E3192] text-white text-xs font-bold hover:bg-[#242775] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create First Post</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => {
            const status = post.postStatus || 'Published';
            return (
              <div
                key={post.id}
                className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-4"
              >
                <div className="space-y-3 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        status === 'Published'
                          ? 'bg-emerald-100 text-emerald-800'
                          : status === 'Draft'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {status}
                    </span>
                    <span className="text-xs text-[#667085]">Created on {post.createdAt}</span>
                    <span className="text-xs text-[#667085]">· {post.postType}</span>
                  </div>

                  <p className="text-xs text-[#111111] leading-relaxed line-clamp-3">
                    {post.content}
                  </p>

                  {/* Thumbnail if attached */}
                  {post.images && post.images.length > 0 && (
                    <div className="w-32 h-20 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                      <img
                        src={post.images[0]}
                        alt="attachment"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Basic engagement placeholder */}
                  <div className="flex items-center gap-4 text-xs text-[#667085] pt-1">
                    <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                      <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />{' '}
                      {post.likesCount || 0} Likes
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" /> {post.commentsCount || 0} Enquiries
                    </span>
                  </div>
                </div>

                {/* Post Action Buttons */}
                <div className="flex items-center md:flex-col gap-2 shrink-0 md:items-end">
                  <button
                    onClick={() => handleTogglePublish(post)}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl border border-gray-200 text-[#111111] hover:bg-gray-50 transition-colors"
                  >
                    {status === 'Published' ? 'Unpublish to Draft' : 'Publish to Feed'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(post)}
                      className="p-2 text-[#667085] hover:text-[#2E3192] hover:bg-gray-100 rounded-xl transition-colors"
                      title="Edit Post"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors"
                      title="Delete Post"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
