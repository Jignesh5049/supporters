import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Button } from '@supporters/ui-native/components/button';
import { Text } from '@supporters/ui-native/components/text';
import { cn } from '@supporters/ui-native/lib/utils';
import { useMyProducts, useMyServices } from '../../catalog/hooks';

interface ListingPickerProps {
  kind: 'product' | 'service';
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

/** Attach one of the owner's published listings to a post as a card. */
export function ListingPicker({ kind, selectedId, onSelect }: ListingPickerProps) {
  const products = useMyProducts({ status: 'published' });
  const services = useMyServices({ status: 'published' });
  const query = kind === 'product' ? products : services;
  const items: { id: string; title: string }[] = (query.data?.pages ?? []).flatMap((page) =>
    page.data.map(({ id, title }) => ({ id, title })),
  );

  if (query.isPending) return <ActivityIndicator />;
  if (items.length === 0) {
    return (
      <Text variant="muted" className="text-sm">
        Publish a {kind} first to attach it to a post.
      </Text>
    );
  }
  return (
    <View className="gap-2">
      {items.map((item) => {
        const isSelected = item.id === selectedId;
        return (
          <Button
            key={item.id}
            variant={isSelected ? 'default' : 'outline'}
            className={cn('justify-start')}
            onPress={() => onSelect(isSelected ? null : item.id)}
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${isSelected ? 'Remove' : 'Attach'} ${item.title}`}
          >
            <Text numberOfLines={1}>{item.title}</Text>
          </Button>
        );
      })}
      {query.hasNextPage ? (
        <Button variant="ghost" size="sm" onPress={() => query.fetchNextPage()}>
          <Text>Show more</Text>
        </Button>
      ) : null}
    </View>
  );
}
