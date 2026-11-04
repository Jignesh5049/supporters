import React, { useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { router } from 'expo-router';
import { Bookmark } from 'lucide-react-native';
import type { SaveTargetType, SavedItem } from '@supporters/shared';
import { Button } from '@supporters/ui-native/components/button';
import { Tabs, TabsList, TabsTrigger } from '@supporters/ui-native/components/tabs';
import { Text } from '@supporters/ui-native/components/text';
import { EmptyState } from '@supporters/ui-native/patterns';
import { useApp } from '../context/AppContext';
import { messageForError } from '../lib/api';
import { PostCard } from '../features/feed/components';
import { usePostActions } from '../features/feed/use-post-actions';
import { BusinessRow } from '../features/social/components/BusinessRow';
import { ListingRow } from '../features/social/components/ListingRow';
import { useSaves } from '../features/social/hooks';
import { useToggleSave } from '../features/social/hooks/use-save';
import { toPostCardModel } from '../features/social/mappers';

const TABS: { value: SaveTargetType; label: string; empty: string }[] = [
  { value: 'post', label: 'Posts', empty: 'Tap the bookmark on a post to keep it here.' },
  { value: 'product', label: 'Products', empty: 'Save products to compare suppliers later.' },
  { value: 'service', label: 'Services', empty: 'Save services you may want to book.' },
  { value: 'business', label: 'Sellers', empty: 'Save businesses to find them again.' },
];

const seg = encodeURIComponent;

export function SavedScreen() {
  const { showToast } = useApp();
  const [tab, setTab] = useState<SaveTargetType>('post');
  const saves = useSaves(tab);
  const postActions = usePostActions();
  const { mutate: toggleSave } = useToggleSave();
  const items: SavedItem[] = saves.data?.pages.flatMap((page) => page.data) ?? [];

  const unsave = (type: SaveTargetType, id: string) =>
    toggleSave(
      { type, id, isSaved: false },
      { onError: (error) => showToast(messageForError(error), 'error') },
    );

  const renderItem = ({ item }: { item: SavedItem }) => {
    switch (item.type) {
      case 'post':
        return <PostCard post={toPostCardModel(item.post)} {...postActions} />;
      case 'product':
        return (
          <ListingRow
            listing={item.product}
            onPress={() => router.push(`/product/${seg(item.product.id)}`)}
            onUnsave={() => unsave('product', item.product.id)}
          />
        );
      case 'service':
        return (
          <ListingRow
            listing={item.service}
            onPress={() => router.push(`/service/${seg(item.service.id)}`)}
            onUnsave={() => unsave('service', item.service.id)}
          />
        );
      case 'business':
        return (
          <BusinessRow
            business={item.business}
            onPress={(business) => router.push(`/business/${seg(business.slug)}`)}
            action={{ label: 'Remove', onPress: (business) => unsave('business', business.id) }}
          />
        );
    }
  };

  return (
    <View className="bg-background flex-1">
      <View className="border-border border-b px-4 pb-2 pt-3">
        <Text variant="h4">Saved</Text>
        <Tabs value={tab} onValueChange={(value) => setTab(value as SaveTargetType)}>
          <TabsList className="mt-2 w-full flex-row">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="flex-1">
                <Text>{t.label}</Text>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </View>

      {saves.isPending ? (
        <ActivityIndicator className="mt-8" />
      ) : saves.isError && items.length === 0 ? (
        <View className="items-center gap-3 p-8">
          <Text className="text-center">{messageForError(saves.error)}</Text>
          <Button onPress={() => saves.refetch()}>
            <Text>Try again</Text>
          </Button>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
          ListEmptyComponent={
            <EmptyState
              icon={<Bookmark size={32} color="#9CA3AF" />}
              title={`No saved ${TABS.find((t) => t.value === tab)?.label.toLowerCase()} yet`}
              description={TABS.find((t) => t.value === tab)?.empty}
              actionLabel="Explore the feed"
              onAction={() => router.push('/')}
              className="mx-4 my-6"
            />
          }
          onEndReached={() => {
            if (saves.hasNextPage && !saves.isFetchingNextPage) saves.fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          refreshing={saves.isRefetching && !saves.isFetchingNextPage}
          onRefresh={() => saves.refetch()}
        />
      )}
    </View>
  );
}
