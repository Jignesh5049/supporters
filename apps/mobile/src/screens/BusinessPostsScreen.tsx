import React, { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Plus } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PLAN_LIMITS, PostStatus, type Post } from '@supporters/shared';
import { Button } from '@supporters/ui-native/components/button';
import { Icon } from '@supporters/ui-native/components/icon';
import { Tabs, TabsList, TabsTrigger } from '@supporters/ui-native/components/tabs';
import { Text } from '@supporters/ui-native/components/text';
import { EmptyState } from '@supporters/ui-native/patterns';
import { useApp } from '../context/AppContext';
import { messageForError } from '../lib/api';
import { EditPostModal } from '../features/hub/components/EditPostModal';
import { HubPostRow, type PostAction } from '../features/hub/components/HubPostRow';
import { useDeletePost, useMyPosts, useUpdatePost } from '../features/hub/hooks/use-my-posts';

type Filter = 'all' | PostStatus;
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: PostStatus.Published, label: 'Published' },
  { value: PostStatus.Draft, label: 'Drafts' },
  { value: PostStatus.Archived, label: 'Archived' },
];

export function BusinessPostsScreen() {
  const { showToast } = useApp();
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<Post | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const posts = useMyPosts(filter === 'all' ? undefined : filter);
  const update = useUpdatePost();
  const remove = useDeletePost();
  const items = posts.data?.pages.flatMap((page) => page.data) ?? [];
  const isBusy = update.isPending || remove.isPending;

  const setStatus = (post: Post, status: PostStatus, done: string) =>
    update.mutate(
      { id: post.id, status },
      {
        onSuccess: () => showToast(done, 'success'),
        // Includes the weekly limit message when publishing hits the free plan cap.
        onError: (error) => showToast(messageForError(error), 'error'),
      },
    );

  const handleAction = (action: PostAction, post: Post) => {
    switch (action) {
      case 'edit':
        setEditError(null);
        setEditing(post);
        break;
      case 'publish':
        setStatus(post, PostStatus.Published, 'Post published');
        break;
      case 'archive':
        setStatus(post, PostStatus.Archived, 'Post archived');
        break;
      case 'delete':
        Alert.alert('Delete post', 'This permanently deletes the post and its comments.', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () =>
              remove.mutate(post.id, {
                onSuccess: () => showToast('Post deleted', 'success'),
                onError: (error) => showToast(messageForError(error), 'error'),
              }),
          },
        ]);
        break;
    }
  };

  return (
    <SafeAreaView className="bg-background flex-1">
      <View className="border-border flex-row items-center gap-2 border-b px-2 py-2">
        <Button
          variant="ghost"
          size="icon"
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <Icon as={ArrowLeft} size={20} />
        </Button>
        <Text className="flex-1 text-base font-semibold">Manage posts</Text>
        <Button size="sm" onPress={() => router.push('/create')} accessibilityLabel="New post">
          <Icon as={Plus} size={14} className="text-primary-foreground" />
          <Text>New</Text>
        </Button>
      </View>

      <View className="px-4 py-2">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
          <TabsList className="w-full">
            {FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value} className="flex-1">
                <Text>{f.label}</Text>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Text variant="muted" className="mt-2 text-xs">
          The free plan publishes up to {PLAN_LIMITS.free.postsPer7Days} posts in any 7 days.
        </Text>
      </View>

      {posts.isPending ? (
        <ActivityIndicator className="mt-8" />
      ) : posts.isError && items.length === 0 ? (
        <View className="items-center gap-3 p-8">
          <Text className="text-center">{messageForError(posts.error)}</Text>
          <Button onPress={() => posts.refetch()}>
            <Text>Try again</Text>
          </Button>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(post) => post.id}
          renderItem={({ item }) => (
            <HubPostRow post={item} isBusy={isBusy} onAction={handleAction} />
          )}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 24 }}
          ListEmptyComponent={
            <EmptyState
              title="No posts here"
              description="Share an update, product or offer with your followers."
              actionLabel="Create a post"
              onAction={() => router.push('/create')}
              className="mx-4 my-6"
            />
          }
          onEndReached={() => {
            if (posts.hasNextPage && !posts.isFetchingNextPage) posts.fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          refreshing={posts.isRefetching && !posts.isFetchingNextPage}
          onRefresh={() => posts.refetch()}
        />
      )}

      <EditPostModal
        post={editing}
        isSaving={update.isPending}
        error={editError}
        onClose={() => setEditing(null)}
        onSave={(changes) =>
          editing &&
          update.mutate(
            { id: editing.id, ...changes },
            {
              onSuccess: () => {
                setEditing(null);
                showToast('Post updated', 'success');
              },
              onError: (error) => setEditError(messageForError(error)),
            },
          )
        }
      />
    </SafeAreaView>
  );
}
