import React, { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ArrowLeft, Wrench, Plus } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ListingStatus, type Service } from '@supporters/shared';
import { Button } from '@supporters/ui-native/components/button';
import { Icon } from '@supporters/ui-native/components/icon';
import { Text } from '@supporters/ui-native/components/text';
import { EmptyState } from '@supporters/ui-native/patterns';
import { useApp } from '../context/AppContext';
import { messageForError } from '../lib/api';
import { hasNoBusiness, useMyBusiness } from '../features/business/hooks';
import { listingsUsage } from '../features/business/labels';
import {
  useMyServices,
  useRemoveServiceMutation,
  useUpdateServiceMutation,
} from '../features/catalog/hooks';
import { servicePriceLabel } from '../features/catalog/labels';
import { AddServiceModal } from '../features/hub/components/AddServiceModal';
import {
  ListingRowActions,
  ListingStatusTabs,
} from '../features/hub/components/ListingManageParts';

export function HubServicesScreen() {
  const router = useRouter();
  const { showToast } = useApp();
  const business = useMyBusiness();
  const [status, setStatus] = useState<ListingStatus>(ListingStatus.Published);
  const services = useMyServices({ status });
  const update = useUpdateServiceMutation();
  const remove = useRemoveServiceMutation();
  const [editing, setEditing] = useState<Service | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const items = services.data?.pages.flatMap((page) => page.data) ?? [];
  const usage = business.data
    ? listingsUsage(business.data.publishedListings, business.data.publishedListingsLimit)
    : null;

  const openModal = (service: Service | null) => {
    setEditing(service);
    setModalOpen(true);
  };

  const changeStatus = (service: Service, next: ListingStatus) =>
    update.mutate(
      { id: service.id, data: { status: next } },
      {
        onSuccess: () =>
          showToast(next === ListingStatus.Published ? 'Service published' : 'Service archived'),
        onError: (error) => showToast(messageForError(error), 'error'),
      },
    );

  const confirmDelete = (service: Service) =>
    Alert.alert('Delete Service', `Remove "${service.title}" from your catalog for good?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          remove.mutate(service.id, {
            onSuccess: () => showToast('Service deleted', 'info'),
            onError: (error) => showToast(messageForError(error), 'error'),
          }),
      },
    ]);

  const header = (
    <View className="gap-3 pb-3">
      <Text variant="muted" className="text-xs">
        Manage the services shown on your Supporters business storefront.
      </Text>
      {usage ? (
        <Text className={usage.atLimit ? 'text-destructive text-xs' : 'text-xs'}>
          {usage.label} published listings (services and services together)
        </Text>
      ) : null}
      <ListingStatusTabs value={status} onChange={setStatus} />
    </View>
  );

  const noBusiness = business.isError && hasNoBusiness(business.error);

  return (
    <SafeAreaView className="bg-background flex-1">
      <View className="border-border flex-row items-center justify-between border-b px-3 py-2">
        <View className="flex-row items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          >
            <Icon as={ArrowLeft} size={20} />
          </Button>
          <Text className="text-base font-bold">Services</Text>
        </View>
        <Button size="sm" disabled={!business.data} onPress={() => openModal(null)}>
          <Icon as={Plus} size={16} className="text-primary-foreground" />
          <Text>Add Service</Text>
        </Button>
      </View>

      {noBusiness ? (
        <View className="flex-1 justify-center p-4">
          <EmptyState
            title="Create your business first"
            description="Services belong to your business page."
            actionLabel="Create your business"
            onAction={() => router.push('/hub/edit')}
          />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(service) => service.id}
          contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
          ListHeaderComponent={header}
          onEndReached={() => services.hasNextPage && services.fetchNextPage()}
          onEndReachedThreshold={0.5}
          refreshing={services.isRefetching && !services.isFetchingNextPage}
          onRefresh={() => services.refetch()}
          ListEmptyComponent={
            services.isPending ? (
              <ActivityIndicator className="mt-8" />
            ) : services.isError ? (
              <View className="items-center gap-3 py-8">
                <Text className="text-center">{messageForError(services.error)}</Text>
                <Button variant="outline" onPress={() => services.refetch()}>
                  <Text>Try again</Text>
                </Button>
              </View>
            ) : (
              <View className="items-center gap-2 py-12">
                <Icon as={Wrench} size={48} className="text-muted-foreground" />
                <Text className="text-base font-bold">No services here yet</Text>
                <Text variant="muted" className="px-5 text-center text-sm">
                  List what you offer to start receiving buyer enquiries.
                </Text>
                {status !== ListingStatus.Archived ? (
                  <Button className="mt-2" onPress={() => openModal(null)}>
                    <Text>Add a service</Text>
                  </Button>
                ) : null}
              </View>
            )
          }
          renderItem={({ item }) => (
            <Pressable
              className="border-border bg-card mb-2.5 flex-row gap-3 rounded-xl border p-3"
              onPress={() =>
                item.status === ListingStatus.Published
                  ? router.push(`/service/${item.id}`)
                  : openModal(item)
              }
              accessibilityRole="button"
              accessibilityLabel={item.title}
            >
              <Image
                source={{ uri: item.images[0]?.url }}
                style={{ width: 80, height: 80, borderRadius: 8 }}
                contentFit="cover"
                accessibilityLabel={item.title}
              />
              <View className="flex-1 gap-1">
                <Text className="text-muted-foreground text-xs font-bold">
                  {item.category.name}
                </Text>
                <Text className="text-sm font-bold" numberOfLines={1}>
                  {item.title}
                </Text>
                <Text className="text-primary text-sm font-extrabold">
                  {servicePriceLabel(item)}
                </Text>
                {item.turnaround ? (
                  <Text variant="muted" className="text-xs">
                    Turnaround: {item.turnaround}
                  </Text>
                ) : null}
                <ListingRowActions
                  status={item.status}
                  isBusy={update.isPending || remove.isPending}
                  onPublish={() => changeStatus(item, ListingStatus.Published)}
                  onArchive={() => changeStatus(item, ListingStatus.Archived)}
                  onEdit={() => openModal(item)}
                  onDelete={() => confirmDelete(item)}
                />
              </View>
            </Pressable>
          )}
        />
      )}

      <AddServiceModal
        visible={modalOpen}
        service={editing}
        onClose={() => setModalOpen(false)}
        onSaved={(message) => {
          setModalOpen(false);
          showToast(message);
        }}
      />
    </SafeAreaView>
  );
}
