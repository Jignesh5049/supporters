'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { CURRENT_USER } from '@/lib/mock-data';
import { Avatar } from '@/components/common/Avatar';
import { PostType } from '@/types';
import {
  Package,
  Wrench,
  Sparkles,
  Tag,
  Image as ImageIcon,
  X,
  Send,
  CheckCircle2
} from 'lucide-react';

export function CreatePostWidget() {
  const { addPost } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [postType, setPostType] = useState<PostType>('update');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [offerTag, setOfferTag] = useState('');

  const openWithCategory = (type: PostType) => {
    setPostType(type);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    let attachedProduct = undefined;
    let attachedService = undefined;

    if (postType === 'product' && title) {
      attachedProduct = {
        id: `custom-p-${Date.now()}`,
        title: title,
        price: parseFloat(price) || 5000,
        image: imageUrl || 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80',
        moq: 1,
        unit: 'Units'
      };
    } else if (postType === 'service' && title) {
      attachedService = {
        id: `custom-s-${Date.now()}`,
        title: title,
        startingPrice: parseFloat(price) || 2500,
        image: imageUrl || 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80',
        unit: 'per job'
      };
    }

    addPost({
      postType,
      content,
      images: imageUrl ? [imageUrl] : undefined,
      attachedProduct,
      attachedService,
      offerTag: postType === 'offer' ? (offerTag || 'SPECIAL OFFER') : undefined
    });

    // Reset and close
    setContent('');
    setImageUrl('');
    setTitle('');
    setPrice('');
    setOfferTag('');
    setModalOpen(false);
  };

  return (
    <>
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-2xs">
        {/* Top input bar */}
        <div className="flex items-center gap-3">
          <Avatar
            src={CURRENT_USER.avatar}
            name={CURRENT_USER.name}
            size="md"
            verified
          />
          <button
            onClick={() => setModalOpen(true)}
            className="flex-1 bg-[#F7F8FC] hover:bg-gray-100 text-[#667085] text-left px-4 py-2.5 rounded-full text-sm font-normal border border-[#E5E7EB] transition-colors"
          >
            What would you like to share with the network?
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between gap-1 mt-3 pt-3 border-t border-[#E5E7EB]">
          <button
            type="button"
            onClick={() => openWithCategory('product')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#111111] hover:bg-blue-50 hover:text-[#2E3192] transition-colors"
          >
            <Package className="w-4 h-4 text-[#2E3192]" />
            <span>Product</span>
          </button>

          <button
            type="button"
            onClick={() => openWithCategory('service')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#111111] hover:bg-cyan-50 hover:text-[#00AEEF] transition-colors"
          >
            <Wrench className="w-4 h-4 text-[#00AEEF]" />
            <span>Service</span>
          </button>

          <button
            type="button"
            onClick={() => openWithCategory('update')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#111111] hover:bg-purple-50 hover:text-purple-700 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Business Update</span>
          </button>

          <button
            type="button"
            onClick={() => openWithCategory('offer')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#111111] hover:bg-pink-50 hover:text-[#A3238E] transition-colors"
          >
            <Tag className="w-4 h-4 text-[#A3238E]" />
            <span>Offer</span>
          </button>
        </div>
      </div>

      {/* Modal for creating post */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-2xl max-w-lg w-full border border-[#E5E7EB] shadow-2xl overflow-hidden"
            role="dialog"
          >
            <div className="flex items-center justify-between p-4 border-b border-[#E5E7EB] bg-[#F7F8FC]">
              <div className="flex items-center gap-2">
                <Avatar src={CURRENT_USER.avatar} name={CURRENT_USER.name} size="sm" verified />
                <div>
                  <h3 className="text-sm font-bold text-[#111111]">Create Social Listing</h3>
                  <p className="text-xs text-[#667085]">Visible to thousands of verified buyers & sellers</p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-[#667085] hover:text-[#111111] p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Type selector pill */}
              <div className="flex items-center gap-1.5 p-1 bg-[#F7F8FC] rounded-xl border border-[#E5E7EB]">
                {(['update', 'product', 'service', 'offer'] as PostType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPostType(t)}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                      postType === t
                        ? 'bg-[#2E3192] text-white shadow-xs'
                        : 'text-[#667085] hover:text-[#111111]'
                    }`}
                  >
                    {t === 'update' ? 'Update' : t}
                  </button>
                ))}
              </div>

              {/* Textarea */}
              <div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={
                    postType === 'product'
                      ? 'Describe your product specifications, availability, and wholesale delivery terms...'
                      : postType === 'service'
                      ? 'Describe your service expertise, capacity, and client deliverables...'
                      : postType === 'offer'
                      ? 'Announce your festive wholesale discounts, bulk lot pricing, or limited deals...'
                      : 'Share a company milestone, factory expansion, or production update...'
                  }
                  rows={4}
                  className="w-full text-sm text-[#111111] border border-[#E5E7EB] rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#2E3192]/20 focus:border-[#2E3192] resize-none"
                  required
                />
              </div>

              {/* Product / Service Attachment Fields */}
              {(postType === 'product' || postType === 'service') && (
                <div className="p-3.5 rounded-xl bg-[#F7F8FC] border border-[#E5E7EB] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2E3192] uppercase tracking-wider">
                      Attach {postType === 'product' ? 'Product' : 'Service'} Details
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-[#00AEEF]" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#111111] mb-1">
                        Title / Name
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={postType === 'product' ? 'e.g. 55-inch Smart LED TV' : 'e.g. Turnkey Woodwork'}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#2E3192]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#111111] mb-1">
                        Price (₹ INR)
                      </label>
                      <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="e.g. 18999"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#2E3192]"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Offer Tag */}
              {postType === 'offer' && (
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">
                    Promotional Tag (e.g. FESTIVE 15% OFF)
                  </label>
                  <input
                    type="text"
                    value={offerTag}
                    onChange={(e) => setOfferTag(e.target.value)}
                    placeholder="DIWALI BULK LOT DISCOUNT"
                    className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#A3238E]"
                  />
                </div>
              )}

              {/* Image URL input */}
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  Optional Image URL
                </label>
                <div className="relative">
                  <ImageIcon className="w-4 h-4 text-[#667085] absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full pl-9 pr-3 py-2 text-xs border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#2E3192]"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#667085] hover:text-[#111111]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#2E3192] hover:bg-[#242775] rounded-xl shadow-xs transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Publish to Supporters</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
