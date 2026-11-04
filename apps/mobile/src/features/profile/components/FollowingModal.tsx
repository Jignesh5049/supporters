import React from 'react';
import { ActivityIndicator, FlatList, Modal, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@supporters/ui-native/components/button';
import { Icon } from '@supporters/ui-native/components/icon';
import { Text } from '@supporters/ui-native/components/text';
import { EmptyState } from '@supporters/ui-native/patterns';
import { useApp } from '../../../context/AppContext';
import { messageForError } from '../../../lib/api';
import { BusinessRow } from '../../social/components/BusinessRow';
import { useFollowing, useToggleFollow } from '../../social/hooks/use-follow';

interface FollowingModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenBusiness: (slug: string) => void;
}

/** The businesses the user follows (users follow businesses only, product spec Decisions 2). */
export function FollowingModal({ visible, onClose, onOpenBusiness }: FollowingModalProps) {
  const { showToast } = useApp();
  const following = useFollowing();
  const { mutate: toggleFollow, isPending } = useToggleFollow();
  const items = following.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="bg-background flex-1">
        <View className="border-border flex-row items-center gap-2 border-b px-2 py-2">
          <Button
            variant="ghost"
            size="icon"
            onPress={onClose}
            accessibilityLabel="Close following list"
          >
            <Icon as={ArrowLeft} size={20} />
          </Button>
          <Text className="text-base font-semibold">Following</Text>
        </View>

        {following.isPending ? (
          <ActivityIndicator className="mt-8" />
        ) : following.isError && items.length === 0 ? (
          <View className="items-center gap-3 p-8">
            <Text className="text-center">{messageForError(following.error)}</Text>
            <Button onPress={() => following.refetch()}>
              <Text>Try again</Text>
            </Button>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.business.id}
            renderItem={({ item }) => (
              <BusinessRow
                business={item.business}
                onPress={(business) => {
                  onClose();
                  onOpenBusiness(business.slug);
                }}
                action={{
                  label: 'Unfollow',
                  isBusy: isPending,
                  onPress: (business) =>
                    toggleFollow(
                      { businessId: business.id, isFollowing: false },
                      { onError: (error) => showToast(messageForError(error), 'error') },
                    ),
                }}
              />
            )}
            ListEmptyComponent={
              <EmptyState
                title="Not following anyone yet"
                description="Follow businesses to see their posts on your home feed."
                className="mx-4 my-6"
              />
            }
            onEndReached={() => {
              if (following.hasNextPage && !following.isFetchingNextPage) following.fetchNextPage();
            }}
            onEndReachedThreshold={0.5}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}
