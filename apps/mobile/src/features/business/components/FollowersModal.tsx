import React from 'react';
import { ActivityIndicator, FlatList, Modal, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, AvatarFallback } from '@supporters/ui-native/components/avatar';
import { Button } from '@supporters/ui-native/components/button';
import { Icon } from '@supporters/ui-native/components/icon';
import { Text } from '@supporters/ui-native/components/text';
import { EmptyState } from '@supporters/ui-native/patterns';
import { messageForError } from '../../../lib/api';
import { useFollowers } from '../../social/hooks/use-follow';

interface FollowersModalProps {
  visible: boolean;
  onClose: () => void;
  businessId: string;
  businessName: string;
}

/** The people who follow a business. The API shows a name only. */
export function FollowersModal({
  visible,
  onClose,
  businessId,
  businessName,
}: FollowersModalProps) {
  const followers = useFollowers(businessId, visible);
  const items = followers.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="bg-background flex-1">
        <View className="border-border flex-row items-center gap-2 border-b px-2 py-2">
          <Button
            variant="ghost"
            size="icon"
            onPress={onClose}
            accessibilityLabel="Close followers"
          >
            <Icon as={ArrowLeft} size={20} />
          </Button>
          <Text className="flex-1 text-base font-semibold" numberOfLines={1}>
            {businessName} followers
          </Text>
        </View>
        {followers.isPending ? (
          <ActivityIndicator className="mt-8" />
        ) : followers.isError && items.length === 0 ? (
          <View className="items-center gap-3 p-8">
            <Text className="text-center">{messageForError(followers.error)}</Text>
            <Button onPress={() => followers.refetch()}>
              <Text>Try again</Text>
            </Button>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.user.id}
            renderItem={({ item }) => (
              <View className="border-border flex-row items-center gap-3 border-b px-4 py-3">
                <Avatar alt={item.user.name} className="size-10">
                  <AvatarFallback className="bg-primary/10">
                    <Text className="text-primary text-sm font-bold">
                      {item.user.name.trim().charAt(0).toUpperCase() || '?'}
                    </Text>
                  </AvatarFallback>
                </Avatar>
                <Text className="text-sm font-semibold">{item.user.name}</Text>
              </View>
            )}
            ListEmptyComponent={<EmptyState title="No followers yet" className="mx-4 my-6" />}
            onEndReached={() => {
              if (followers.hasNextPage && !followers.isFetchingNextPage) followers.fetchNextPage();
            }}
            onEndReachedThreshold={0.5}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}
