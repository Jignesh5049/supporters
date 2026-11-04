import React, { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, NativeScrollEvent, NativeSyntheticEvent, View } from 'react-native';
import { FlashList, type ViewToken } from '@shopify/flash-list';
import { router } from 'expo-router';
import { Button } from '@supporters/ui-native/components/button';
import { Skeleton } from '@supporters/ui-native/components/skeleton';
import { Text } from '@supporters/ui-native/components/text';
import { useApp } from '../context/AppContext';
import { messageForError } from '../lib/api';
import { SessionStatus, useSessionStore } from '../stores/session-store';
import {
  FeedEmptyState,
  FeedHeader,
  FeedSignUpPrompt,
  PostCard,
} from '../features/feed/components';
import { buildFeedRows, type FeedRow } from '../features/feed/feed-items';
import { useFeed, useMarkFeedSeen } from '../features/feed/hooks';
import { usePostActions } from '../features/feed/use-post-actions';
import { toPostCardModel } from '../features/social/mappers';

export function HomeScreen() {
  const { setHeaderVisible } = useApp();
  const isGuest = useSessionStore((state) => state.status !== SessionStatus.SignedIn);
  const actions = usePostActions();
  const markSeen = useMarkFeedSeen();
  const feed = useFeed();
  const lastOffsetY = useRef(0);

  useEffect(() => () => setHeaderVisible(true), [setHeaderVisible]);

  const rows = React.useMemo(
    () => buildFeedRows(feed.data?.pages ?? [], isGuest),
    [feed.data, isGuest],
  );

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentY = event.nativeEvent.contentOffset.y;
    const diff = currentY - lastOffsetY.current;
    if (currentY <= 15) setHeaderVisible(true);
    else if (diff > 8 && currentY > 35) setHeaderVisible(false);
    else if (diff < -8) setHeaderVisible(true);
    lastOffsetY.current = currentY;
  };

  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<FeedRow>[] }) => {
      const ids = viewableItems.flatMap(({ item }) =>
        item?.kind === 'post' ? [item.post.id] : [],
      );
      if (ids.length > 0) markSeen(ids);
    },
    [markSeen],
  );

  const handleEndReached = () => {
    if (feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
  };

  if (feed.isPending) {
    return (
      <View className="bg-background flex-1 gap-3 p-4" accessibilityLabel="Loading feed">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-64 w-full rounded-xl" />
        ))}
      </View>
    );
  }

  if (feed.isError && rows.length === 0) {
    return (
      <View className="bg-background flex-1 items-center justify-center gap-3 p-6">
        <Text className="text-center">{messageForError(feed.error)}</Text>
        <Button onPress={() => feed.refetch()} accessibilityLabel="Try again">
          <Text>Try again</Text>
        </Button>
      </View>
    );
  }

  return (
    <View className="bg-background flex-1">
      <FlashList
        data={rows}
        keyExtractor={(row) => row.key}
        getItemType={(row) => row.kind}
        renderItem={({ item }) =>
          item.kind === 'prompt' ? (
            <FeedSignUpPrompt onSignUp={() => router.push('/sign-up')} />
          ) : (
            <PostCard post={toPostCardModel(item.post)} {...actions} />
          )
        }
        ListHeaderComponent={
          <FeedHeader onPostRequirement={() => router.push('/requirements/new')} />
        }
        ListEmptyComponent={
          <FeedEmptyState
            isGuest={isGuest}
            onAction={() => router.push(isGuest ? '/sign-in' : '/discover')}
          />
        }
        ListFooterComponent={
          feed.isFetchingNextPage ? <ActivityIndicator className="my-4" /> : null
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        onViewableItemsChanged={handleViewableItemsChanged}
        refreshing={feed.isRefetching && !feed.isFetchingNextPage}
        onRefresh={() => feed.refetch()}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />
    </View>
  );
}
