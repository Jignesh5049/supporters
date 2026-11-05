import React, { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Inbox } from 'lucide-react-native';
import type { Enquiry, EnquiryStatus, ListingRef } from '@supporters/shared';
import { Button } from '@supporters/ui-native/components/button';
import { Icon } from '@supporters/ui-native/components/icon';
import { Text } from '@supporters/ui-native/components/text';
import { EmptyState } from '@supporters/ui-native/patterns';
import { useApp } from '../context/AppContext';
import { messageForError } from '../lib/api';
import { hasNoBusiness, useMyBusiness } from '../features/business/hooks';
import { useMyProducts, useMyServices } from '../features/catalog/hooks';
import { useBusinessEnquiries, useCloseEnquiry } from '../features/enquiries/hooks';
import { ENQUIRY_STATUS_LABEL } from '../features/enquiries/labels';
import { EnquiryLeadCard } from '../features/hub/components/EnquiryLeadCard';
import { OptionPicker } from '../features/hub/components/OptionPicker';

const STATUS_FILTERS: (EnquiryStatus | 'all')[] = ['all', 'new', 'responded', 'closed'];
const DATE_FILTERS = [
  { id: 'all', label: 'All time' },
  { id: '7', label: 'Last 7 days' },
  { id: '30', label: 'Last 30 days' },
  { id: '90', label: 'Last 90 days' },
];

/** Product and service filter options from the owner's own listings. */
function useListingOptions() {
  const products = useMyProducts();
  const services = useMyServices();
  return [
    { id: 'all', label: 'All listings' },
    ...(products.data?.pages ?? []).flatMap((page) =>
      page.data.map((p) => ({ id: `product:${p.id}`, label: p.title })),
    ),
    ...(services.data?.pages ?? []).flatMap((page) =>
      page.data.map((s) => ({ id: `service:${s.id}`, label: `${s.title} (service)` })),
    ),
  ];
}

function toListing(id: string): ListingRef | undefined {
  const [type, listingId] = id.split(':');
  return (type === 'product' || type === 'service') && listingId
    ? { type, id: listingId }
    : undefined;
}

/** The business's enquiries (product spec, Enquiries: business side). Reply opens the thread. */
export function HubEnquiriesScreen() {
  const router = useRouter();
  const { showToast } = useApp();
  const business = useMyBusiness();
  const [status, setStatus] = useState<EnquiryStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [listingFilter, setListingFilter] = useState('all');
  const listingOptions = useListingOptions();
  const enquiries = useBusinessEnquiries({
    status: status === 'all' ? undefined : status,
    days: dateFilter === 'all' ? undefined : Number(dateFilter),
    listing: toListing(listingFilter),
  });
  const close = useCloseEnquiry();
  const items = enquiries.data?.pages.flatMap((page) => page.data) ?? [];

  const confirmClose = (enquiry: Enquiry) =>
    Alert.alert('Close this enquiry?', 'The conversation stays open; only the status changes.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Close',
        onPress: () =>
          close.mutate(enquiry.id, {
            onSuccess: () => showToast('Enquiry closed', 'info'),
            onError: (error) => showToast(messageForError(error), 'error'),
          }),
      },
    ]);

  const noBusiness = business.isError && hasNoBusiness(business.error);

  return (
    <SafeAreaView className="bg-background flex-1">
      <View className="border-border bg-card gap-3 border-b px-3 pb-3 pt-2">
        <View className="flex-row items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          >
            <Icon as={ArrowLeft} size={20} />
          </Button>
          <Text className="text-base font-bold">Enquiries</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2"
        >
          {STATUS_FILTERS.map((value) => (
            <Button
              key={value}
              size="sm"
              variant={status === value ? 'default' : 'outline'}
              onPress={() => setStatus(value)}
              accessibilityState={{ selected: status === value }}
            >
              <Text>{value === 'all' ? 'All' : ENQUIRY_STATUS_LABEL[value]}</Text>
            </Button>
          ))}
        </ScrollView>
        <View className="flex-row gap-2">
          <View className="flex-1">
            <OptionPicker
              title="Date"
              placeholder="All time"
              options={DATE_FILTERS}
              value={dateFilter}
              onChange={setDateFilter}
            />
          </View>
          <View className="flex-1">
            <OptionPicker
              title="Listing"
              placeholder="All listings"
              options={listingOptions}
              value={listingFilter}
              searchable
              onChange={setListingFilter}
            />
          </View>
        </View>
      </View>

      {noBusiness ? (
        <View className="flex-1 justify-center p-4">
          <EmptyState
            title="Create your business first"
            description="Enquiries arrive for your products and services."
            actionLabel="Create your business"
            onAction={() => router.push('/hub/edit')}
          />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(enquiry) => enquiry.id}
          contentContainerClassName="gap-3 p-3 pb-10"
          renderItem={({ item }) => (
            <EnquiryLeadCard
              enquiry={item}
              isClosing={close.isPending && close.variables === item.id}
              onReply={(enquiry) => router.push(`/messages/${enquiry.conversationId}`)}
              onCall={(phone) => void Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`)}
              onClose={confirmClose}
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
                <Icon as={Inbox} size={40} className="text-muted-foreground" />
                <Text className="text-base font-bold">No enquiries here</Text>
                <Text variant="muted" className="text-center text-sm">
                  Enquiries buyers send about your products and services appear here.
                </Text>
              </View>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}
