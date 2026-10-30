'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/types';
import { useApp } from '@/context/AppContext';
import { Avatar } from '@/components/common/Avatar';
import { Bookmark, MapPin, Building2, Star, MessageSquare } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { savedProductIds, toggleSaveProduct, openConversationWithBusiness } = useApp();
  const isSaved = savedProductIds.includes(product.id);

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-2xs hover:shadow-xs transition-all flex flex-col group">
      {/* Product Image Container */}
      <div className="relative aspect-4/3 w-full bg-gray-100 overflow-hidden">
        <Link href={`/product/${product.id}`} className="block w-full h-full relative">
          <Image
            src={product.images[0]}
            alt={product.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            unoptimized
          />
        </Link>

        {/* Save Bookmark button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            toggleSaveProduct(product.id);
          }}
          className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-xs transition-colors shadow-xs ${
            isSaved ? 'bg-[#2E3192] text-white' : 'bg-white/85 text-[#111111] hover:bg-white'
          }`}
          aria-label={isSaved ? 'Remove from saved' : 'Save product'}
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
        </button>

        {/* Availability Badge */}
        <span className="absolute bottom-2.5 left-2.5 bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">
          {product.availability}
        </span>
      </div>

      {/* Content Body */}
      <div className="p-4 flex flex-col flex-1">
        {/* Business Header */}
        <div className="flex items-center gap-2 mb-2">
          <Avatar
            src={product.businessAvatar}
            name={product.businessName}
            size="xs"
            verified={product.businessVerified}
          />
          <Link
            href={`/business/${product.businessId}`}
            className="text-xs font-semibold text-[#667085] hover:text-[#2E3192] truncate flex-1"
          >
            {product.businessName}
          </Link>
          <span className="text-[10px] text-[#667085] flex items-center gap-0.5 shrink-0">
            <MapPin className="w-3 h-3" />
            {product.businessCity}
          </span>
        </div>

        {/* Product Title */}
        <Link href={`/product/${product.id}`}>
          <h3 className="text-sm font-bold text-[#111111] group-hover:text-[#2E3192] transition-colors line-clamp-2 leading-snug">
            {product.title}
          </h3>
        </Link>

        {/* Price & MOQ */}
        <div className="mt-3 pt-2 border-t border-[#E5E7EB] flex items-baseline justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-black text-[#2E3192]">
                ₹{product.price.toLocaleString('en-IN')}
              </span>
              {product.originalPrice && (
                <span className="text-xs text-[#667085] line-through">
                  ₹{product.originalPrice.toLocaleString('en-IN')}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#667085]">
              MOQ: {product.minOrderQuantity} {product.unit}
            </p>
          </div>

          <div className="flex items-center gap-1 text-xs font-bold text-[#111111]">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{product.rating}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-auto pt-3 border-t border-[#E5E7EB]/70 flex items-center gap-2">
          <Link
            href={`/product/${product.id}`}
            className="flex-1 py-2 px-2 text-center text-xs font-semibold text-[#2E3192] bg-blue-50/70 hover:bg-blue-100/70 rounded-xl transition-colors truncate whitespace-nowrap"
          >
            View Product
          </Link>
          <button
            type="button"
            onClick={() =>
              openConversationWithBusiness(product.businessId, {
                initialMessage: `Namaste! I am interested in "${product.title}" (₹${product.price.toLocaleString('en-IN')}). Please share wholesale pricing and delivery schedule.`,
                attachedProduct: {
                  id: product.id,
                  title: product.title,
                  price: product.price,
                  image: product.images[0],
                },
              })
            }
            className="flex-1 py-2 px-2 text-center text-xs font-semibold text-white bg-[#2E3192] hover:bg-[#242775] rounded-xl transition-colors shadow-2xs flex items-center justify-center gap-1.5 min-w-0"
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Contact Supplier</span>
          </button>
        </div>
      </div>
    </div>
  );
}
