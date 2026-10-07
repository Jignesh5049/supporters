'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import { CURRENT_USER, CATEGORIES } from '@/lib/mock-data';
import { Avatar } from '@/components/common/Avatar';
import {
  Package,
  Wrench,
  Sparkles,
  Tag,
  Eye,
  Send,
  Image as ImageIcon,
  CheckCircle2,
  MapPin,
  Clock,
  ArrowRight,
  FileEdit,
  Sparkle
} from 'lucide-react';

function CreateFlowContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addPost, showToast, saveDraftListing, clearDraftListing, draftListing } = useApp();

  const [activeTab, setActiveTab] = useState<'product' | 'service' | 'post' | 'offer'>('product');

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [moq, setMoq] = useState('5');
  const [unit, setUnit] = useState('Units');
  const [location, setLocation] = useState('Ahmedabad, Gujarat');
  const [availability, setAvailability] = useState('In Stock');
  const [serviceArea, setServiceArea] = useState('Pan Gujarat & Western Hubs');
  const [imageUrl, setImageUrl] = useState('');
  const [offerTag, setOfferTag] = useState('LIMITED TIME OFFER');
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);

  const [showPreview, setShowPreview] = useState(false);

  // Sync with searchParams (e.g. ?tab=product or ?draft=brass-bush)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['product', 'service', 'post', 'offer'].includes(tabParam)) {
      setActiveTab(tabParam as 'product' | 'service' | 'post' | 'offer');
    }

    const draftParam = searchParams.get('draft');
    if (draftParam === 'brass-bush') {
      setTitle('Brass Hex Bush (Grade CuZn39)');
      setCategory('Industrial');
      setPrice('145');
      setMoq('500');
      setUnit('Pieces');
      setLocation('Jamnagar GIDC, Gujarat');
      setDescription('Precision CNC turned brass hex bushes for hydraulic assemblies and electrical grounding. High corrosion resistance, IS-319 Grade 1 certified.');
      setAvailability('In Stock (10,000 pcs)');
      setImageUrl('https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80');
      setActiveTab('product');
      setIsDraftLoaded(true);
    } else if (draftListing && draftParam === draftListing.id) {
      if (draftListing.title) setTitle(draftListing.title);
      if (draftListing.category) setCategory(draftListing.category);
      if (draftListing.price) setPrice(draftListing.price);
      if (draftListing.moq) setMoq(draftListing.moq);
      if (draftListing.unit) setUnit(draftListing.unit);
      if (draftListing.location) setLocation(draftListing.location);
      if (draftListing.description) setDescription(draftListing.description);
      if (draftListing.imageUrl) setImageUrl(draftListing.imageUrl);
      if (draftListing.offerTag) setOfferTag(draftListing.offerTag);
      if (draftListing.type) setActiveTab(draftListing.type);
      setIsDraftLoaded(true);
    }
  }, [searchParams, draftListing]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (activeTab === 'product') {
      addPost({
        postType: 'product',
        content: `New Product Launch: ${title || 'Commercial Hardware'} now available from ${location}. MOQ: ${moq} ${unit}. ${description}`,
        images: imageUrl ? [imageUrl] : ['https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80'],
        attachedProduct: {
          id: `new-p-${Date.now()}`,
          title: title || 'Verified Manufactured Product',
          price: parseFloat(price) || 9999,
          image: imageUrl || 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80',
          moq: parseInt(moq) || 1,
          unit: unit || 'Units'
        }
      });
      clearDraftListing();
      showToast('Product successfully published to Supporters feed and catalog!', 'success');
      router.push('/');
    } else if (activeTab === 'service') {
      addPost({
        postType: 'service',
        content: `Service Announcement: ${title || 'B2B Trade Service'} serving ${serviceArea}. Starting from ₹${price || '5000'}. ${description}`,
        images: imageUrl ? [imageUrl] : ['https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80'],
        attachedService: {
          id: `new-s-${Date.now()}`,
          title: title || 'Professional B2B Service',
          startingPrice: parseFloat(price) || 5000,
          image: imageUrl || 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80'
        }
      });
      clearDraftListing();
      showToast('B2B Service successfully listed on Supporters!', 'success');
      router.push('/');
    } else if (activeTab === 'post') {
      addPost({
        postType: 'update',
        content: description || `Factory and dispatch update from ${CURRENT_USER.name}. Connecting with regional supply partners.`,
        images: imageUrl ? [imageUrl] : undefined
      });
      clearDraftListing();
      showToast('Social update published to your business stream!', 'success');
      router.push('/');
    } else if (activeTab === 'offer') {
      addPost({
        postType: 'offer',
        content: `SPECIAL TRADE DEAL [${offerTag}]: ${title || 'Bulk Volume Offer'}. ${description} Valid while stocks last. Contact directly for wholesale slabs.`,
        images: imageUrl ? [imageUrl] : ['https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&auto=format&fit=crop&q=80'],
        offerTag: offerTag || 'WHOLESALE DEAL'
      });
      clearDraftListing();
      showToast('Promotional trade deal broadcasted to buyers!', 'success');
      router.push('/');
    }
  };

  const handleSaveDraft = () => {
    const draftId = `draft-${Date.now()}`;
    saveDraftListing({
      id: draftId,
      type: activeTab,
      title: title || (activeTab === 'product' ? 'Unsaved Product Draft' : activeTab === 'service' ? 'Unsaved Service Draft' : 'Unsaved Draft'),
      category,
      price,
      moq,
      unit,
      location,
      description,
      imageUrl,
      offerTag,
      resumeUrl: `/create?tab=${activeTab}&draft=${draftId}`,
      updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    setIsDraftLoaded(true);
    showToast('Listing draft saved! You can resume anytime from the mobile create popup.', 'info');
  };

  return (
    <div className="space-y-6 max-w-4xl pb-16 md:pb-6">
      {/* Draft Resume Alert Banner */}
      {isDraftLoaded && (
        <div className="bg-[#EEF2FF] border border-[#C7D2FE] rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#2E3192] text-white flex items-center justify-center shrink-0">
              <FileEdit className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#2E3192]">Draft Resumed</p>
              <p className="text-[11px] text-[#4338CA] truncate">
                Editing: {title || draftListing?.title || 'Unsaved Draft'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-bold bg-[#E0E7FF] text-[#2E3192] px-2.5 py-1 rounded-full">
              Draft Active
            </span>
            <button
              type="button"
              onClick={() => {
                clearDraftListing();
                setIsDraftLoaded(false);
                showToast('Draft discarded.', 'info');
              }}
              className="text-xs text-indigo-700 hover:text-indigo-900 underline font-medium"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Header & Segmented Tabs */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-6 shadow-2xs">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-[#111111]">
                Publish New Listing or Update
              </h1>
              <span className="md:hidden text-[10px] font-bold bg-blue-50 text-[#2E3192] px-2 py-0.5 rounded-full border border-blue-100">
                App Studio
              </span>
            </div>
            <p className="text-xs text-[#667085] mt-1">
              Choose whether to list a physical product for bulk trade, advertise a specialized B2B service, post a company milestone, or run a promotion.
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 sm:mt-5">
          <button
            type="button"
            onClick={() => setActiveTab('product')}
            className={`flex items-center justify-center gap-2 py-2.5 sm:py-3 px-3 rounded-xl text-xs font-bold transition-all active:scale-95 ${
              activeTab === 'product'
                ? 'bg-[#2E3192] text-white shadow-xs'
                : 'bg-[#F7F8FC] text-[#667085] hover:text-[#111111] hover:bg-gray-100'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Create Product</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('service')}
            className={`flex items-center justify-center gap-2 py-2.5 sm:py-3 px-3 rounded-xl text-xs font-bold transition-all active:scale-95 ${
              activeTab === 'service'
                ? 'bg-[#00AEEF] text-white shadow-xs'
                : 'bg-[#F7F8FC] text-[#667085] hover:text-[#111111] hover:bg-gray-100'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Add Service</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('post')}
            className={`flex items-center justify-center gap-2 py-2.5 sm:py-3 px-3 rounded-xl text-xs font-bold transition-all active:scale-95 ${
              activeTab === 'post'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-[#F7F8FC] text-[#667085] hover:text-[#111111] hover:bg-gray-100'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Business Post</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('offer')}
            className={`flex items-center justify-center gap-2 py-2.5 sm:py-3 px-3 rounded-xl text-xs font-bold transition-all active:scale-95 ${
              activeTab === 'offer'
                ? 'bg-[#A3238E] text-white shadow-xs'
                : 'bg-[#F7F8FC] text-[#667085] hover:text-[#111111] hover:bg-gray-100'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Create Offer</span>
          </button>
        </div>
      </div>

      {/* Main Form and Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Container (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-6 shadow-2xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title / Name */}
            {activeTab !== 'post' && (
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">
                  {activeTab === 'product' ? 'Product Name & Model' : activeTab === 'service' ? 'Service Title' : 'Offer Headline'}
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    activeTab === 'product'
                      ? 'e.g. 55-inch Ultra HD 4K Commercial Display'
                      : activeTab === 'service'
                      ? 'e.g. Turnkey CNC Precision Machining & Milling'
                      : 'e.g. 25% Off Monsoon Bulk Order Clearance'
                  }
                  className="w-full px-3.5 py-2.5 bg-[#F7F8FC] border border-[#E5E7EB] rounded-xl text-xs sm:text-sm text-[#111111] focus:outline-none focus:border-[#2E3192] focus:bg-white transition-all"
                />
              </div>
            )}

            {/* Category & Offer Tag */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeTab !== 'post' && (
                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    Industry Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F7F8FC] border border-[#E5E7EB] rounded-xl text-xs sm:text-sm text-[#111111] focus:outline-none focus:border-[#2E3192]"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {activeTab === 'offer' && (
                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    Offer Badge Tag
                  </label>
                  <input
                    type="text"
                    value={offerTag}
                    onChange={(e) => setOfferTag(e.target.value)}
                    placeholder="e.g. FESTIVAL SPECIAL, 20% BULK DISCOUNT"
                    className="w-full px-3.5 py-2.5 bg-[#F7F8FC] border border-[#E5E7EB] rounded-xl text-xs sm:text-sm text-[#111111] focus:outline-none focus:border-[#2E3192]"
                  />
                </div>
              )}

              {activeTab === 'product' && (
                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    Availability / Stock Status
                  </label>
                  <select
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F7F8FC] border border-[#E5E7EB] rounded-xl text-xs sm:text-sm text-[#111111] focus:outline-none focus:border-[#2E3192]"
                  >
                    <option value="In Stock">In Stock (Immediate Dispatch)</option>
                    <option value="Made to Order">Made to Order (Lead time applies)</option>
                    <option value="Limited Quantity">Limited Quantity Clearance</option>
                  </select>
                </div>
              )}
            </div>

            {/* Pricing and MOQ (Product) */}
            {activeTab === 'product' && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    Unit Price (₹)
                  </label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="28000"
                    className="w-full px-3.5 py-2.5 bg-[#F7F8FC] border border-[#E5E7EB] rounded-xl text-xs sm:text-sm text-[#111111] focus:outline-none focus:border-[#2E3192]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    Min Order (MOQ)
                  </label>
                  <input
                    type="number"
                    value={moq}
                    onChange={(e) => setMoq(e.target.value)}
                    placeholder="5"
                    className="w-full px-3.5 py-2.5 bg-[#F7F8FC] border border-[#E5E7EB] rounded-xl text-xs sm:text-sm text-[#111111] focus:outline-none focus:border-[#2E3192]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    Unit Type
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F7F8FC] border border-[#E5E7EB] rounded-xl text-xs sm:text-sm text-[#111111] focus:outline-none focus:border-[#2E3192]"
                  >
                    <option value="Units">Units</option>
                    <option value="Pieces">Pieces</option>
                    <option value="Sets">Sets</option>
                    <option value="Kg">Kg</option>
                    <option value="Meters">Meters</option>
                    <option value="Boxes">Boxes</option>
                  </select>
                </div>
              </div>
            )}

            {/* Pricing & Area (Service) */}
            {activeTab === 'service' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    Starting Quotation (₹)
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="15000"
                    className="w-full px-3.5 py-2.5 bg-[#F7F8FC] border border-[#E5E7EB] rounded-xl text-xs sm:text-sm text-[#111111] focus:outline-none focus:border-[#2E3192]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    Service Region / Coverage
                  </label>
                  <input
                    type="text"
                    value={serviceArea}
                    onChange={(e) => setServiceArea(e.target.value)}
                    placeholder="e.g. Pan India, Western Region, Ahmedabad & Surat"
                    className="w-full px-3.5 py-2.5 bg-[#F7F8FC] border border-[#E5E7EB] rounded-xl text-xs sm:text-sm text-[#111111] focus:outline-none focus:border-[#2E3192]"
                  />
                </div>
              </div>
            )}

            {/* Location */}
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1">
                Dispatch / Base Location
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-[#667085] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Naroda Industrial Area, Ahmedabad, Gujarat"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-[#F7F8FC] border border-[#E5E7EB] rounded-xl text-xs sm:text-sm text-[#111111] focus:outline-none focus:border-[#2E3192]"
                />
              </div>
            </div>

            {/* Description / Content */}
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1">
                {activeTab === 'post' ? 'Post Content & Announcement' : 'Technical Specifications & Description'}
              </label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  activeTab === 'product'
                    ? 'State dimensions, certifications (ISO, CE, BIS), technical tolerances, and freight packaging details...'
                    : activeTab === 'service'
                    ? 'Outline your machinery capability, turnaround SLAs, quality control standards, and past client works...'
                    : 'Share dispatch announcements, factory upgrades, warehouse expansion, or partnership updates with your B2B network...'
                }
                className="w-full p-3 bg-[#F7F8FC] border border-[#E5E7EB] rounded-xl text-xs sm:text-sm text-[#111111] focus:outline-none focus:border-[#2E3192] focus:bg-white resize-y"
              />
            </div>

            {/* Media Upload / URL */}
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1">
                Photo URL / Media Attachment
              </label>
              <div className="relative">
                <ImageIcon className="w-4 h-4 text-[#667085] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-... (Paste direct image link)"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-[#F7F8FC] border border-[#E5E7EB] rounded-xl text-xs sm:text-sm text-[#111111] focus:outline-none focus:border-[#2E3192]"
                />
              </div>
              <p className="text-[11px] text-[#667085] mt-1">
                Tip: High-resolution factory floor or product sample photos receive 3x more buyer enquiries.
              </p>
            </div>

            {/* Desktop Action Buttons */}
            <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="lg:hidden flex items-center gap-1.5 text-xs font-bold text-[#2E3192]"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showPreview ? 'Hide Preview' : 'View Preview'}</span>
              </button>

              <div className="flex items-center gap-2.5 ml-auto">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-3.5 py-2 text-xs font-semibold text-[#667085] hover:text-[#111111]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="px-3.5 py-2 text-xs font-bold text-[#2E3192] bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors active:scale-95"
                >
                  Save Draft
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#2E3192] hover:bg-[#242775] rounded-xl shadow-xs transition-colors active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Publish to Network</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Live Preview Container (5 cols) */}
        <div className={`lg:col-span-5 space-y-3 ${showPreview ? 'block' : 'hidden lg:block'}`}>
          <div className="flex items-center gap-2 px-1">
            <Eye className="w-4 h-4 text-[#2E3192]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#667085]">
              Live Social-Feed Preview
            </h3>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-2xs space-y-3">
            {/* Business Header */}
            <div className="flex items-center gap-3">
              <Avatar src={CURRENT_USER.avatar} name={CURRENT_USER.name} size="md" verified />
              <div>
                <h4 className="text-xs font-bold text-[#111111]">
                  {title ? 'Shree Electronics & Systems' : CURRENT_USER.name}
                </h4>
                <p className="text-[10px] text-[#667085]">
                  Ahmedabad · Just now
                </p>
              </div>
            </div>

            {/* Offer Tag Preview */}
            {activeTab === 'offer' && (
              <div className="inline-block px-2.5 py-0.5 rounded bg-[#A3238E]/10 text-[#A3238E] text-[11px] font-bold">
                {offerTag}
              </div>
            )}

            {/* Post Content */}
            <p className="text-xs text-[#111111] leading-relaxed">
              {description || 'Your product, service, or update description will appear here inside the live social feed.'}
            </p>

            {/* Image Preview */}
            <div className="w-full aspect-16/9 bg-gray-100 rounded-xl overflow-hidden relative border border-[#E5E7EB]">
              <Image
                src={imageUrl || 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80'}
                alt="Preview"
                fill
                className="object-cover"
                unoptimized
              />
            </div>

            {/* Attached Snippet for product/service */}
            {(activeTab === 'product' || activeTab === 'service') && (
              <div className="p-3 rounded-xl bg-[#F7F8FC] border border-[#E5E7EB] flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-bold text-[#111111] line-clamp-1">
                    {title || 'Sample Item Title'}
                  </h5>
                  <p className="text-xs font-black text-[#2E3192] mt-0.5">
                    ₹{price ? parseInt(price).toLocaleString('en-IN') : '18,999'}
                    {activeTab === 'product' ? ` (MOQ: ${moq} ${unit})` : ' starting'}
                  </p>
                </div>
                <button
                  type="button"
                  className="px-3 py-1.5 text-[11px] font-bold text-white bg-[#2E3192] rounded-lg"
                >
                  Contact
                </button>
              </div>
            )}

            {/* Social stats */}
            <div className="pt-2 border-t border-[#E5E7EB] flex justify-between text-[11px] text-[#667085]">
              <span>👍 0 likes</span>
              <span>0 comments</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Floating Action Bar (Phone View Only) */}
      <div className="md:hidden fixed bottom-16 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#E5E7EB] p-3 shadow-lg">
        <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-[#111111] truncate">
              {title || (activeTab === 'product' ? 'New Product' : activeTab === 'service' ? 'New Service' : activeTab === 'offer' ? 'Special Deal' : 'Social Update')}
            </p>
            <span className="text-[10px] text-[#667085] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Tap to broadcast
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-3 py-2 bg-indigo-50 active:scale-95 text-[#2E3192] font-bold text-xs rounded-xl border border-indigo-100"
            >
              Draft
            </button>
            <button
              type="button"
              onClick={() => handleSubmit()}
              className="px-4 sm:px-5 py-2 bg-gradient-to-r from-[#2E3192] to-[#4338CA] active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Publish</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreateFlowPage() {
  return (
    <Suspense fallback={
      <div className="p-8 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-[#2E3192] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-[#667085]">Loading Supporters creation studio...</p>
      </div>
    }>
      <CreateFlowContent />
    </Suspense>
  );
}
