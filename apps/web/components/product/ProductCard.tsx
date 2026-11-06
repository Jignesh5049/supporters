'use client';

import React from 'react';
import Link from 'next/link';
import { Product } from '@/types';
import { useApp } from '@/context/AppContext';
import {
  ProductCard as PatternProductCard,
  type ProductCardData,
} from '@supporters/ui-web/patterns/product-card';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { savedProductIds, toggleSaveProduct, openConversationWithBusiness } = useApp();
  const isSaved = savedProductIds.includes(product.id);

  const cardData: ProductCardData = {
    id: product.id,
    title: product.title,
    images: product.images,
    price: product.price,
    originalPrice: product.originalPrice,
    minOrderQuantity: product.minOrderQuantity,
    unit: product.unit,
    availability: product.availability,
    businessId: product.businessId,
    businessName: product.businessName,
    businessAvatar: product.businessAvatar,
    businessCity: product.businessCity,
    businessVerified: product.businessVerified,
    rating: product.rating,
    reviewsCount: product.reviewCount,
  };

  return (
    <PatternProductCard
      product={cardData}
      isSaved={isSaved}
      onToggleSave={toggleSaveProduct}
      onEnquire={() => {
        openConversationWithBusiness(product.businessId, {
          initialMessage: `Hi, I am interested in your product: "${product.title}" (MOQ: ${product.minOrderQuantity} ${product.unit}). Please share wholesale pricing.`,
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
