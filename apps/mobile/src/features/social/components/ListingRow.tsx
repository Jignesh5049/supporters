import React from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import type { Product, Service } from '@supporters/shared';
import { Button } from '@supporters/ui-native/components/button';
import { Text } from '@supporters/ui-native/components/text';
import { formatPrice } from '../mappers';

interface ListingRowProps {
  listing: Product | Service;
  onPress: () => void;
  onUnsave?: () => void;
}

export function ListingRow({ listing, onPress, onUnsave }: ListingRowProps) {
  const image = listing.images[0];
  return (
    <View className="border-border flex-row items-center gap-3 border-b px-4 py-3">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Open ${listing.title}`}
        className="min-h-11 flex-1 flex-row items-center gap-3"
      >
        {image ? (
          <Image
            source={{ uri: image.url }}
            style={{ width: 56, height: 56, borderRadius: 8 }}
            contentFit="cover"
            cachePolicy="disk"
          />
        ) : (
          <View className="bg-muted size-14 rounded-lg" />
        )}
        <View className="flex-1">
          <Text className="text-sm font-semibold" numberOfLines={2}>
            {listing.title}
          </Text>
          <Text variant="muted" className="text-xs" numberOfLines={1}>
            {listing.business.name}
          </Text>
          <Text className="text-primary text-xs font-semibold">{formatPrice(listing.price)}</Text>
        </View>
      </Pressable>
      {onUnsave ? (
        <Button
          variant="outline"
          size="sm"
          onPress={onUnsave}
          accessibilityLabel={`Remove ${listing.title} from saved`}
        >
          <Text>Remove</Text>
        </Button>
      ) : null}
    </View>
  );
}
