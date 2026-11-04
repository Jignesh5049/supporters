import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { z } from 'zod';
import { useApp } from '../context/AppContext';
import { ApiError, ApiErrorCode, messageForError } from '../lib/api';
import { useProduct } from '../features/catalog/hooks';
import {
  ListingDetailState,
  ListingDetailView,
} from '../features/catalog/components/ListingDetailView';
import { RelatedListings } from '../features/catalog/components/RelatedListings';
import {
  areaLabel,
  moqLabel,
  productAvailabilityLabel,
  productPriceLabel,
} from '../features/catalog/labels';
import { useSavedState } from '../features/social/hooks/use-saved-state';
import { useRequireAuth } from '../features/social/use-require-auth';

const paramsSchema = z.object({ id: z.uuid() });

export function ProductDetailScreen() {
  const parsed = paramsSchema.safeParse(useLocalSearchParams());
  const id = parsed.success ? parsed.data.id : '';
  const { openShareModal, openEnquiryModal } = useApp();
  const requireAuth = useRequireAuth();
  const product = useProduct(id);
  const saved = useSavedState('product', id);

  if (product.isPending && parsed.success) {
    return <ListingDetailState title="Product" isLoading />;
  }
  if (!product.data) {
    const isMissing =
      !parsed.success ||
      (product.error instanceof ApiError && product.error.code === ApiErrorCode.NotFound);
    return (
      <ListingDetailState
        title="Product"
        message={isMissing ? 'Product not found' : messageForError(product.error)}
        onRetry={isMissing ? undefined : () => product.refetch()}
      />
    );
  }

  const data = product.data;
  return (
    <ListingDetailView
      headerTitle="Product details"
      title={data.title}
      priceLabel={productPriceLabel(data)}
      availabilityLabel={productAvailabilityLabel(data.availability)}
      images={data.images}
      business={data.business}
      description={data.description}
      details={[
        ['Minimum order', moqLabel(data)],
        ['Delivery', data.deliveryTime],
        ['Ships to', areaLabel(data.shippingArea)],
        ['Category', data.category.name],
      ]}
      specs={data.specs}
      isSaved={saved.isSaved}
      onToggleSave={saved.toggle}
      onShare={() =>
        openShareModal({
          title: data.title,
          url: `https://supporters.in/product/${encodeURIComponent(data.id)}`,
        })
      }
      onEnquiry={() =>
        requireAuth(() =>
          openEnquiryModal({
            title: data.title,
            businessName: data.business.name,
            businessId: data.business.id,
          }),
        )
      }
      related={<RelatedListings kind="product" businessId={data.business.id} currentId={data.id} />}
    />
  );
}
