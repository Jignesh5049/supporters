import React from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Compass, Search } from 'lucide-react-native';
import { Button } from '@supporters/ui-native/components/button';
import { Icon } from '@supporters/ui-native/components/icon';
import { Text } from '@supporters/ui-native/components/text';
import { EmptyState } from '@supporters/ui-native/patterns';
import { messageForError } from '../lib/api';
import { useCategoriesQuery } from '../features/categories/hooks';
import { DiscoverSections } from '../features/search/components/DiscoverSections';
import { useDiscover } from '../features/search/hooks';
import { useViewerId } from '../features/social/use-viewer';

/** Discover: a search entry, categories, and the Trending, Featured, Near you and Suggested rows. */
export function DiscoverScreen() {
  const viewerId = useViewerId();
  const discover = useDiscover(null);
  const categories = useCategoriesQuery();
  const data = discover.data;
  const isEmpty =
    data !== undefined &&
    data.trending.length +
      data.featured.length +
      data.nearYou.data.length +
      data.suggested.length ===
      0;

  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerClassName="gap-4 pb-6 pt-3"
      refreshControl={
        <RefreshControl
          refreshing={discover.isRefetching}
          onRefresh={() => void discover.refetch()}
        />
      }
    >
      <View className="px-4">
        <Text variant="h4">Discover</Text>
        <Pressable
          onPress={() => router.push('/search')}
          accessibilityRole="search"
          accessibilityLabel="Search businesses, products, services and posts"
          className="border-input bg-background mt-2 min-h-11 flex-row items-center gap-2 rounded-md border px-3"
        >
          <Icon as={Search} size={16} className="text-muted-foreground" />
          <Text variant="muted">Search businesses, products, services…</Text>
        </Pressable>
      </View>

      {discover.isPending ? (
        <ActivityIndicator className="mt-8" />
      ) : discover.isError ? (
        <View className="items-center gap-3 p-8">
          <Text className="text-center">{messageForError(discover.error)}</Text>
          <Button onPress={() => discover.refetch()}>
            <Text>Try again</Text>
          </Button>
        </View>
      ) : (
        <>
          <DiscoverSections
            discover={discover.data}
            categories={categories.data?.data ?? []}
            isSignedIn={viewerId !== null}
          />
          {isEmpty ? (
            <EmptyState
              icon={<Compass size={32} color="#9CA3AF" />}
              title="Nothing to show yet"
              description="As businesses join and grow, the busiest and closest ones show here."
              actionLabel="Search"
              onAction={() => router.push('/search')}
              className="mx-4"
            />
          ) : null}
        </>
      )}
    </ScrollView>
  );
}
