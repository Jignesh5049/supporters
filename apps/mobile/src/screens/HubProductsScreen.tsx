import React, { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ArrowLeft, Package, Plus } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ListingStatus, type Product } from '@supporters/shared';
import { Button } from '@supporters/ui-native/components/button';
import { Icon } from '@supporters/ui-native/components/icon';
import { Text } from '@supporters/ui-native/components/text';
import { EmptyState } from '@supporters/ui-native/patterns';
import { useApp } from '../context/AppContext';
import { messageForError } from '../lib/api';
import { hasNoBusiness, useMyBusiness } from '../features/business/hooks';
import { listingsUsage } from '../features/business/labels';
import {
  useMyProducts,
  useRemoveProductMutation,
  useUpdateProductMutation,
} from '../features/catalog/hooks';
import { moqLabel, productPriceLabel } from '../features/catalog/labels';
import { AddProductModal } from '../features/hub/components/AddProductModal';
import {
  ListingRowActions,
  ListingStatusTabs,
} from '../features/hub/components/ListingManageParts';

export function HubProductsScreen() {
  const router = useRouter();
  const { showToast } = useApp();
  const business = useMyBusiness();
  const [status, setStatus] = useState<ListingStatus>(ListingStatus.Published);
  const products = useMyProducts({ status });
  const update = useUpdateProductMutation();
  const remove = useRemoveProductMutation();
  const [editing, setEditing] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const items = products.data?.pages.flatMap((page) => page.data) ?? [];
  const usage = business.data
    ? listingsUsage(business.data.publishedListings, business.data.publishedListingsLimit)
    : null;

  const openModal = (product: Product | null) => {
    setEditing(product);
    setModalOpen(true);
  };

  const changeStatus = (product: Product, next: ListingStatus) =>
    update.mutate(
      { id: product.id, data: { status: next } },
      {
        onSuccess: () =>
          showToast(next === ListingStatus.Published ? 'Product published' : 'Product archived'),
        onError: (error) => showToast(messageForError(error), 'error'),
      },
    );

  const confirmDelete = (product: Product) =>
    Alert.alert('Delete Product', `Remove "${product.title}" from your catalog for good?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          remove.mutate(product.id, {
            onSuccess: () => showToast('Product deleted', 'info'),
            onError: (error) => showToast(messageForError(error), 'error'),
          }),
      },
    ]);

  const header = (
    <View className="gap-3 pb-3">
      <Text variant="muted" className="text-xs">
        Manage wholesale products visible on your Supporters business storefront.
      </Text>
      {usage ? (
        <Text className={usage.atLimit ? 'text-destructive text-xs' : 'text-xs'}>
          {usage.label} published listings (products and services together)
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
          <Text className="text-base font-bold">Products</Text>
        </View>
        <Button size="sm" disabled={!business.data} onPress={() => openModal(null)}>
          <Icon as={Plus} size={16} className="text-primary-foreground" />
          <Text>Add Product</Text>
        </Button>
      </View>

      {noBusiness ? (
        <View className="flex-1 justify-center p-4">
          <EmptyState
            title="Create your business first"
            description="Products belong to your business page."
            actionLabel="Create your business"
            onAction={() => router.push('/hub/edit')}
          />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(product) => product.id}
          contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
          ListHeaderComponent={header}
          onEndReached={() => products.hasNextPage && products.fetchNextPage()}
          onEndReachedThreshold={0.5}
          refreshing={products.isRefetching && !products.isFetchingNextPage}
          onRefresh={() => products.refetch()}
          ListEmptyComponent={
            products.isPending ? (
              <ActivityIndicator className="mt-8" />
            ) : products.isError ? (
              <View className="items-center gap-3 py-8">
                <Text className="text-center">{messageForError(products.error)}</Text>
                <Button variant="outline" onPress={() => products.refetch()}>
                  <Text>Try again</Text>
                </Button>
              </View>
            ) : (
              <View className="items-center gap-2 py-12">
                <Icon as={Package} size={48} className="text-muted-foreground" />
                <Text className="text-base font-bold">No products here yet</Text>
                <Text variant="muted" className="px-5 text-center text-sm">
                  Upload your catalog items to start receiving buyer enquiries.
                </Text>
                {status !== ListingStatus.Archived ? (
                  <Button className="mt-2" onPress={() => openModal(null)}>
                    <Text>Add a product</Text>
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
                  ? router.push(`/product/${item.id}`)
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
                  {productPriceLabel(item)}
                </Text>
                {moqLabel(item) ? (
                  <Text variant="muted" className="text-xs">
                    {moqLabel(item)}
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

      <AddProductModal
        visible={modalOpen}
        product={editing}
        onClose={() => setModalOpen(false)}
        onSaved={(message) => {
          setModalOpen(false);
          showToast(message);
        }}
      />
    </SafeAreaView>
  );
}
