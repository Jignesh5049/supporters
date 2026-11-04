import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import type { Product, Service } from '@supporters/shared';
import { Text } from '@supporters/ui-native/components/text';
import { ListingRow } from '../../social/components/ListingRow';
import { useBusinessProducts, useBusinessServices } from '../hooks';

const seg = encodeURIComponent;

/** More from the same supplier: its other published products or services. */
export function RelatedListings({
  kind,
  businessId,
  currentId,
}: {
  kind: 'product' | 'service';
  businessId: string;
  currentId: string;
}) {
  const products = useBusinessProducts(kind === 'product' ? businessId : '');
  const services = useBusinessServices(kind === 'service' ? businessId : '');
  const query = kind === 'product' ? products : services;
  const items = ((query.data?.pages ?? []) as { data: (Product | Service)[] }[])
    .flatMap((page) => page.data)
    .filter((item) => item.id !== currentId)
    .slice(0, 4);
  if (items.length === 0) return null;
  return (
    <View>
      <Text className="px-4 pt-4 text-sm font-semibold">More from this supplier</Text>
      {items.map((item) => (
        <ListingRow
          key={item.id}
          listing={item}
          onPress={() => router.push(`/${kind}/${seg(item.id)}`)}
        />
      ))}
    </View>
  );
}
