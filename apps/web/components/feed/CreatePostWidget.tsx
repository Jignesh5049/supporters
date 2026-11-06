'use client';

import React, { useState, useRef } from 'react';
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
  CheckCircle2,
  Upload,
  Trash2,
  Maximize2,
} from 'lucide-react';

export function CreatePostWidget() {
  const { addPost } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [postType, setPostType] = useState<PostType>('update');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [offerTag, setOfferTag] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setImageUrl(result);
        // Auto detect ratio
        const img = new window.Image();
        img.onload = () => {
          if (img.naturalHeight > img.naturalWidth * 1.1) {
            setAspectRatio('9:16');
          } else {
            setAspectRatio('16:9');
          }
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    }
  };

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
        image:
          imageUrl ||
          'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80',
        moq: 1,
        unit: 'Units',
      };
    } else if (postType === 'service' && title) {
      attachedService = {
        id: `custom-s-${Date.now()}`,
        title: title,
        startingPrice: parseFloat(price) || 2500,
        image:
          imageUrl ||
          'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80',
        unit: 'per job',
      };
    }

    addPost({
      postType,
      content,
      images: imageUrl ? [imageUrl] : undefined,
      aspectRatio,
      attachedProduct,
      attachedService,
      offerTag: postType === 'offer' ? offerTag || 'SPECIAL OFFER' : undefined,
    });

    // Reset and close
    setContent('');
    setImageUrl('');
    setAspectRatio('16:9');
    setTitle('');
    setPrice('');
    setOfferTag('');
    setModalOpen(false);
  };

  return (
    <>
      <div className="bg-white border border-border rounded-2xl p-4 shadow-2xs">
        {/* Top input bar */}
        <div className="flex items-center gap-3">
          <Avatar src={CURRENT_USER.avatar} name={CURRENT_USER.name} size="md" verified />
          <button
            onClick={() => setModalOpen(true)}
            className="flex-1 bg-background hover:bg-gray-100 text-muted-foreground text-left px-4 py-2.5 rounded-full text-sm font-normal border border-border transition-colors"
          >
            What would you like to share with the network?
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between gap-1 mt-3 pt-3 border-t border-border">
          <button
            type="button"
            onClick={() => openWithCategory('product')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-foreground hover:bg-blue-50 hover:text-primary transition-colors"
          >
            <Package className="w-4 h-4 text-primary" />
            <span>Product</span>
          </button>

          <button
            type="button"
            onClick={() => openWithCategory('service')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-foreground hover:bg-cyan-50 hover:text-info transition-colors"
          >
            <Wrench className="w-4 h-4 text-info" />
            <span>Service</span>
          </button>

          <button
            type="button"
            onClick={() => openWithCategory('update')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-foreground hover:bg-purple-50 hover:text-purple-700 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Business Update</span>
          </button>

          <button
            type="button"
            onClick={() => openWithCategory('offer')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-foreground hover:bg-pink-50 hover:text-highlight transition-colors"
          >
            <Tag className="w-4 h-4 text-highlight" />
            <span>Offer</span>
          </button>
        </div>
      </div>

      {/* Modal for creating post */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-2xl max-w-lg w-full border border-border shadow-2xl overflow-hidden"
            role="dialog"
          >
            <div className="flex items-center justify-between p-4 border-b border-border bg-background">
              <div className="flex items-center gap-2">
                <Avatar src={CURRENT_USER.avatar} name={CURRENT_USER.name} size="sm" verified />
                <div>
                  <h3 className="text-sm font-bold text-foreground">Create Social Listing</h3>
                  <p className="text-xs text-muted-foreground">
                    Visible to thousands of verified buyers & sellers
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Type selector pill */}
              <div className="flex items-center gap-1.5 p-1 bg-background rounded-xl border border-border">
                {(['update', 'product', 'service', 'offer'] as PostType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPostType(t)}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                      postType === t
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
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
                  className="w-full text-sm text-foreground border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  required
                />
              </div>

              {/* Product / Service Attachment Fields */}
              {(postType === 'product' || postType === 'service') && (
                <div className="p-3.5 rounded-xl bg-background border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">
                      Attach {postType === 'product' ? 'Product' : 'Service'} Details
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-info" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Title / Name
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={
                          postType === 'product'
                            ? 'e.g. 55-inch Smart LED TV'
                            : 'e.g. Turnkey Woodwork'
                        }
                        className="w-full px-3 py-1.5 text-xs bg-white border border-border rounded-lg focus:outline-none focus:border-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Price (₹ INR)
                      </label>
                      <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="e.g. 18999"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-border rounded-lg focus:outline-none focus:border-primary"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Offer Tag */}
              {postType === 'offer' && (
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Promotional Tag (e.g. FESTIVE 15% OFF)
                  </label>
                  <input
                    type="text"
                    value={offerTag}
                    onChange={(e) => setOfferTag(e.target.value)}
                    placeholder="DIWALI BULK LOT DISCOUNT"
                    className="w-full px-3 py-2 text-xs border border-border rounded-lg focus:outline-none focus:border-highlight"
                  />
                </div>
              )}

              {/* Image Upload Section */}
              <div className="space-y-3 pt-1 border-t border-border">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-foreground">Post Media Photo</label>
                  <span className="text-[11px] text-muted-foreground">Auto-detects image orientation</span>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />

                {imageUrl ? (
                  <div className="relative border border-border rounded-xl overflow-hidden bg-gray-50">
                    <div
                      className={`w-full relative mx-auto overflow-hidden bg-black/5 ${
                        aspectRatio === '9:16' ? 'max-w-[220px] aspect-[9/16]' : 'aspect-16/9'
                      }`}
                    >
                      <img
                        src={imageUrl}
                        alt="Uploaded preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute top-2 right-2 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded bg-black/60 text-white backdrop-blur-xs">
                        {aspectRatio}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setImageUrl('');
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="p-1 rounded-lg bg-red-600/90 text-white hover:bg-red-700 transition-colors shadow-sm"
                        title="Remove image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border hover:border-primary bg-muted hover:bg-muted rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-full bg-white shadow-2xs flex items-center justify-center text-primary group-hover:scale-105 transition-transform mb-2">
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-foreground">
                      Click to upload image{' '}
                      <span className="font-normal text-muted-foreground">({aspectRatio} format)</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Supports JPG, PNG, WebP up to 10MB
                    </p>
                  </div>
                )}

                {/* Or paste direct URL */}
                <div className="relative">
                  <ImageIcon className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="url"
                    value={imageUrl.startsWith('data:') ? '' : imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Or paste external image URL..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-border rounded-lg focus:outline-none focus:border-primary text-foreground"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-xs transition-colors"
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
