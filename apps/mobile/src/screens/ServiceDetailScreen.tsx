import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { z } from 'zod';
import { useApp } from '../context/AppContext';
import { ApiError, ApiErrorCode, messageForError } from '../lib/api';
import { useService } from '../features/catalog/hooks';
import {
  ListingDetailState,
  ListingDetailView,
} from '../features/catalog/components/ListingDetailView';
import { RelatedListings } from '../features/catalog/components/RelatedListings';
import { areaLabel, serviceAvailabilityLabel, servicePriceLabel } from '../features/catalog/labels';
import { useSavedState } from '../features/social/hooks/use-saved-state';
import { useRequireAuth } from '../features/social/use-require-auth';

const paramsSchema = z.object({ id: z.uuid() });

export function ServiceDetailScreen() {
  const parsed = paramsSchema.safeParse(useLocalSearchParams());
  const id = parsed.success ? parsed.data.id : '';
  const { openShareModal, openEnquiryModal } = useApp();
  const requireAuth = useRequireAuth();
  const service = useService(id);
  const saved = useSavedState('service', id);

  if (service.isPending && parsed.success) {
    return <ListingDetailState title="Service" isLoading />;
  }
  if (!service.data) {
    const isMissing =
      !parsed.success ||
      (service.error instanceof ApiError && service.error.code === ApiErrorCode.NotFound);
    return (
      <ListingDetailState
        title="Service"
        message={isMissing ? 'Service not found' : messageForError(service.error)}
        onRetry={isMissing ? undefined : () => service.refetch()}
      />
    );
  }

  const data = service.data;
  return (
    <ListingDetailView
      headerTitle="Service details"
      title={data.title}
      priceLabel={servicePriceLabel(data)}
      availabilityLabel={serviceAvailabilityLabel(data.availability)}
      images={data.images}
      business={data.business}
      description={data.description}
      details={[
        ['Turnaround', data.turnaround],
        ['Service area', areaLabel(data.serviceArea)],
        ['Category', data.category.name],
      ]}
      features={data.features}
      isSaved={saved.isSaved}
      onToggleSave={saved.toggle}
      onShare={() =>
        openShareModal({
          title: data.title,
          url: `https://supporters.in/service/${encodeURIComponent(data.id)}`,
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
      related={<RelatedListings kind="service" businessId={data.business.id} currentId={data.id} />}
    />
  );
}
