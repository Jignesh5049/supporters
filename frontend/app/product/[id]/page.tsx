'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import { Avatar } from '@/components/common/Avatar';
import { ProductCard } from '@/components/product/ProductCard';
import { ShareModal } from '@/components/common/ShareModal';
import { EmptyState } from '@/components/common/EmptyState';
import {
  Bookmark,
  Share2,
  Building2,
  MapPin,
  Star,
  ShieldCheck,
  Truck,
  Package,
  Phone,
  MessageSquare,
  Send,
  ArrowRight,
  Clock,
  Layers
} from 'lucide-react';

import { Suspense } from 'react';

function ProductDetailContent() {
  const params = useParams();
  const productId = params?.id as string;
  const { products, businesses, savedProductIds, toggleSaveProduct, openConversationWithBusiness, openEnquiryModal } = useApp();

  const product = products.find((p) => p.id === productId) || products[0];
  const business = businesses.find((b) => b.id === product?.businessId) || businesses[0];

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const isSaved = savedProductIds.includes(product.id);

  const relatedProducts = products.filter(
    (p) => p.id !== product.id && p.category === product.category
  );
  const moreFromBusiness = products.filter(
    (p) => p.id !== product.id && p.businessId === product.businessId
  );

  return (
    <div className="space-y-8">
      {/* Main Product Showcase Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-2xs">
        {/* Left: Gallery (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="relative aspect-4/3 w-full bg-[#F7F8FC] rounded-2xl overflow-hidden border border-[#E5E7EB]">
            <Image
              src={product.images[selectedImageIndex] || product.images[0]}
              alt={product.title}
              fill
              className="object-cover"
              priority
              unoptimized
            />
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-xs text-white text-xs font-semibold px-2.5 py-1 rounded-md">
              {product.availability}
            </div>
          </div>

          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`w-16 h-16 rounded-xl overflow-hidden relative border-2 shrink-0 transition-all ${
                    selectedImageIndex === idx
                      ? 'border-[#2E3192] scale-102 ring-2 ring-[#2E3192]/20'
                      : 'border-[#E5E7EB] opacity-70 hover:opacity-100'
                  }`}
                >
                  <Image src={img} alt="Thumbnail" fill className="object-cover" unoptimized />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Center: Product Information (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold text-[#00AEEF] uppercase tracking-wider">
                {product.category}
              </span>
              <span>·</span>
              <div className="flex items-center gap-1 text-xs font-bold text-[#111111]">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{product.rating}</span>
                <span className="text-[#667085] font-normal">({product.reviewCount} reviews)</span>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-[#111111] leading-snug">
              {product.title}
            </h1>
          </div>

          {/* Pricing & MOQ Box */}
          <div className="p-4 bg-[#F7F8FC] border border-[#E5E7EB] rounded-2xl">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#2E3192]">
                ₹{product.price.toLocaleString('en-IN')}
              </span>
              {product.originalPrice && (
                <span className="text-sm text-[#667085] line-through">
                  ₹{product.originalPrice.toLocaleString('en-IN')}
                </span>
              )}
              <span className="text-xs text-[#667085]">
                / {product.unit}
              </span>
            </div>

            <div className="mt-2 pt-2 border-t border-[#E5E7EB] grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[#667085] block">Minimum Order:</span>
                <span className="font-bold text-[#111111]">
                  {product.minOrderQuantity} {product.unit}
                </span>
              </div>
              <div>
                <span className="text-[#667085] block">Est. Delivery:</span>
                <span className="font-bold text-[#111111]">
                  {product.deliveryTime}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111] mb-1.5">
              Product Overview
            </h3>
            <p className="text-xs sm:text-sm text-[#667085] leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Delivery & Shipping Info */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/50 border border-blue-100 text-xs text-[#111111]">
            <Truck className="w-4 h-4 text-[#2E3192] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#2E3192]">Shipping Coverage:</span>
              <p className="text-[#667085] mt-0.5">
                {product.shippingAreas.join(', ')}
              </p>
            </div>
          </div>

          {/* Quick Actions (Save & Share) */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => toggleSaveProduct(product.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                isSaved
                  ? 'bg-blue-50 border-[#2E3192] text-[#2E3192]'
                  : 'bg-white border-[#E5E7EB] text-[#111111] hover:bg-gray-50'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              <span>{isSaved ? 'Saved to Collection' : 'Save Product'}</span>
            </button>

            <button
              onClick={() => setShareModalOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-white border border-[#E5E7EB] text-[#111111] hover:bg-gray-50 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Listing</span>
            </button>
          </div>
        </div>

        {/* Right: Business Supplier Card (3 cols) */}
        <div className="lg:col-span-3 space-y-4 lg:border-l lg:border-[#E5E7EB] lg:pl-6">
          <div className="p-4 bg-[#F7F8FC] border border-[#E5E7EB] rounded-2xl space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#667085]">
              Verified Supplier
            </span>

            <div className="flex items-center gap-3">
              <Avatar
                src={business.avatar}
                name={business.name}
                size="md"
                verified={business.verified}
              />
              <div className="min-w-0">
                <Link
                  href={`/business/${business.id}`}
                  className="text-sm font-bold text-[#111111] hover:text-[#2E3192] line-clamp-1"
                >
                  {business.name}
                </Link>
                <p className="text-xs text-[#667085]">
                  {business.businessType}
                </p>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-[#667085] pt-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#2E3192]" />
                <span>{business.city}, {business.state}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#00AEEF]" />
                <span>Response: {business.responseRate}</span>
              </div>
              {business.gstin && (
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>GSTIN: {business.gstin}</span>
                </div>
              )}
            </div>

            <Link
              href={`/business/${business.id}`}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-center text-xs font-semibold text-[#2E3192] bg-white border border-[#E5E7EB] rounded-xl hover:bg-gray-50 transition-colors"
            >
              <span>View Business Profile</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Primary Supplier CTAs */}
          <div className="space-y-2.5">
            <button
              onClick={() =>
                openConversationWithBusiness(business.id, {
                  initialMessage: `Namaste! I am interested in "${product.title}" (₹${product.price.toLocaleString('en-IN')}). Please share wholesale pricing and delivery schedule.`,
                  attachedProduct: {
                    id: product.id,
                    title: product.title,
                    price: product.price,
                    image: product.images[0]
                  }
                })
              }
              className="w-full flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold text-white bg-[#2E3192] hover:bg-[#242775] rounded-xl shadow-xs transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Contact Supplier</span>
            </button>

            <Link
              href="/messages"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-[#00AEEF] bg-cyan-50/70 hover:bg-cyan-100/70 border border-[#00AEEF]/20 rounded-xl transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chat with Supplier</span>
            </Link>

            <a
              href={`tel:${business.phone}`}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-[#111111] bg-white hover:bg-gray-50 border border-[#E5E7EB] rounded-xl transition-colors"
            >
              <Phone className="w-4 h-4 text-emerald-600" />
              <span>Call: {business.phone}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Specifications Table Section */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 border-b border-[#E5E7EB] pb-3">
          <Layers className="w-5 h-5 text-[#2E3192]" />
          <h2 className="text-base font-bold text-[#111111]">
            Technical & Commercial Specifications
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-xs sm:text-sm">
          {Object.entries(product.specifications).map(([key, val]) => (
            <div key={key} className="flex justify-between py-2 border-b border-[#E5E7EB]/60">
              <span className="text-[#667085] font-medium">{key}</span>
              <span className="text-[#111111] font-semibold text-right">{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* More from this Business */}
      {moreFromBusiness.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#111111]">
              More from {business.name}
            </h2>
            <Link href={`/business/${business.id}`} className="text-xs font-semibold text-[#00AEEF] hover:underline">
              View Catalog
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {moreFromBusiness.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#111111]">
              Related Products in {product.category}
            </h2>
            <Link href={`/discover?tab=products`} className="text-xs font-semibold text-[#00AEEF] hover:underline">
              Browse More
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        title={product.title}
        url={typeof window !== 'undefined' ? window.location.href : ''}
      />
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-[#667085]">Loading product specifications...</div>}>
      <ProductDetailContent />
    </Suspense>
  );
}
