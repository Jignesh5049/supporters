import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, View } from 'react-native';
import type { ListingRef } from '@supporters/shared';
import { Button } from '@supporters/ui-native/components/button';
import { Text } from '@supporters/ui-native/components/text';
import { useBusinessProducts, useBusinessServices } from '../../catalog/hooks';
import { formatPrice } from '../../social/mappers';

interface ListingShareSheetProps {
  businessId: string;
  isOpen: boolean;
  onClose: () => void;
  onPick: (listing: ListingRef, title: string) => void;
}

/** Shares one of the thread's business listings as a card. */
export function ListingShareSheet({ businessId, isOpen, onClose, onPick }: ListingShareSheetProps) {
  const [kind, setKind] = useState<ListingRef['type']>('product');
  const products = useBusinessProducts(isOpen ? businessId : '');
  const services = useBusinessServices(isOpen ? businessId : '');
  const query = kind === 'product' ? products : services;
  const items = (query.data?.pages ?? []).flatMap((page) =>
    page.data.map((listing) => ({ id: listing.id, title: listing.title, price: listing.price })),
  );

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose} accessibilityLabel="Close" />
      <View className="bg-background max-h-[70%] gap-3 rounded-t-2xl p-4 pb-8">
        <Text className="text-base font-semibold">Share a listing</Text>
        <View className="flex-row gap-2">
          {(['product', 'service'] as const).map((value) => (
            <Button
              key={value}
              size="sm"
              variant={kind === value ? 'default' : 'outline'}
              onPress={() => setKind(value)}
              accessibilityState={{ selected: kind === value }}
            >
              <Text>{value === 'product' ? 'Products' : 'Services'}</Text>
            </Button>
          ))}
        </View>
        <FlatList
          data={items}
          keyExtractor={(listing) => listing.id}
          onEndReached={() => query.hasNextPage && query.fetchNextPage()}
          ListEmptyComponent={
            query.isPending ? (
              <ActivityIndicator className="my-6" />
            ) : (
              <Text variant="muted" className="py-6 text-center text-sm">
                No {kind === 'product' ? 'products' : 'services'} to share yet.
              </Text>
            )
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                onClose();
                onPick({ type: kind, id: item.id }, item.title);
              }}
              className="border-border active:bg-muted min-h-12 justify-center border-b py-2"
              accessibilityRole="button"
              accessibilityLabel={`Share ${item.title}`}
            >
              <Text className="text-sm font-medium" numberOfLines={1}>
                {item.title}
              </Text>
              <Text variant="muted" className="text-xs">
                {formatPrice(item.price)}
              </Text>
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}
