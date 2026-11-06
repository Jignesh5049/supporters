import React from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Send } from 'lucide-react-native';
import type { Enquiry } from '@supporters/shared';
import { Badge } from '@supporters/ui-native/components/badge';
import { Button } from '@supporters/ui-native/components/button';
import { Icon } from '@supporters/ui-native/components/icon';
import { Text } from '@supporters/ui-native/components/text';
import { messageForError } from '../../../lib/api';
import { inboxTime } from '../../messages/labels';
import { useMyEnquiries } from '../hooks';
import { ENQUIRY_STATUS_LABEL, enquiryQuantity } from '../labels';

function MyEnquiryRow({ enquiry, onOpen }: { enquiry: Enquiry; onOpen: (e: Enquiry) => void }) {
  const quantity = enquiryQuantity(enquiry);
  const title = enquiry.listing?.title ?? 'Listing no longer available';
  return (
    <Pressable
      onPress={() => onOpen(enquiry)}
      className="border-border active:bg-muted gap-1 border-b px-4 py-3"
      accessibilityRole="button"
      accessibilityLabel={`${title}, to ${enquiry.business.name}. ${ENQUIRY_STATUS_LABEL[enquiry.status]}`}
      accessibilityHint="Opens the conversation"
    >
      <View className="flex-row items-center gap-2">
        <Text className="flex-1 text-sm font-semibold" numberOfLines={1}>
          {title}
        </Text>
        <Badge variant={enquiry.status === 'responded' ? 'default' : 'secondary'}>
          <Text>{ENQUIRY_STATUS_LABEL[enquiry.status]}</Text>
        </Badge>
      </View>
      <Text variant="muted" className="text-xs" numberOfLines={1}>
        {enquiry.business.name}
        {quantity ? ` · ${quantity}` : ''} · {inboxTime(enquiry.createdAt)}
      </Text>
    </Pressable>
  );
}

/** The buyer's enquiries (GET /v1/me/enquiries). Each opens its thread. */
export function MyEnquiriesList() {
  const router = useRouter();
  const enquiries = useMyEnquiries();
  const items = enquiries.data?.pages.flatMap((page) => page.data) ?? [];
  return (
    <FlatList
      data={items}
      keyExtractor={(enquiry) => enquiry.id}
      renderItem={({ item }) => (
        <MyEnquiryRow
          enquiry={item}
          onOpen={(enquiry) => router.push(`/messages/${enquiry.conversationId}`)}
        />
      )}
      onEndReached={() =>
        enquiries.hasNextPage && !enquiries.isFetchingNextPage && enquiries.fetchNextPage()
      }
      onEndReachedThreshold={0.5}
      refreshing={enquiries.isRefetching && !enquiries.isFetchingNextPage}
      onRefresh={() => enquiries.refetch()}
      ListFooterComponent={
        enquiries.isFetchingNextPage ? <ActivityIndicator className="my-4" /> : undefined
      }
      ListEmptyComponent={
        enquiries.isPending ? (
          <ActivityIndicator className="mt-10" />
        ) : enquiries.isError ? (
          <View className="items-center gap-3 py-10">
            <Text className="text-center">{messageForError(enquiries.error)}</Text>
            <Button variant="outline" onPress={() => enquiries.refetch()}>
              <Text>Try again</Text>
            </Button>
          </View>
        ) : (
          <View className="items-center gap-2 px-6 py-16">
            <Icon as={Send} size={36} className="text-muted-foreground" />
            <Text className="text-base font-bold">No enquiries yet</Text>
            <Text variant="muted" className="text-center text-sm">
              Use Send enquiry on a product or service page to ask a supplier for a quote.
            </Text>
          </View>
        )
      }
    />
  );
}
