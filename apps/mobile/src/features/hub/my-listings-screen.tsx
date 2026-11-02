import { ListingStatus } from '@supporters/shared';
import { Button } from '@supporters/ui-native/components/button';
import { Text } from '@supporters/ui-native/components/text';
import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { EmptyList, ListingCard, LoadMoreButton, QueryState } from '../catalog/components';
import { productPriceLabel, servicePriceLabel } from '../catalog/format';
import { flattenPages } from '../catalog/queries';
import { ListingLimitNotice } from './listing-form-shell';
import { useMyBusiness, useMyProducts, useMyServices } from './queries';

const STATUS_LABELS: Record<ListingStatus, string> = {
  [ListingStatus.Draft]: 'Draft',
  [ListingStatus.Published]: 'Published',
  [ListingStatus.Archived]: 'Archived',
};

interface ListingRow {
  id: string;
  title: string;
  priceLabel: string;
  image: { id: string; url: string } | undefined;
  status: ListingStatus;
}

function ListingsLayout({
  title,
  addLabel,
  emptyMessage,
  rows,
  query,
  onAdd,
  onOpen,
}: {
  title: string;
  addLabel: string;
  emptyMessage: string;
  rows: ListingRow[];
  query: {
    isLoading: boolean;
    error: unknown;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    refetch: () => unknown;
    fetchNextPage: () => unknown;
  };
  onAdd: () => void;
  onOpen: (id: string) => void;
}) {
  const business = useMyBusiness().data;
  if (query.isLoading || query.error) {
    return (
      <QueryState isLoading={query.isLoading} error={query.error} onRetry={() => query.refetch()} />
    );
  }
  return (
    <ScrollView className="bg-background flex-1" contentContainerClassName="gap-4 p-4 pb-10">
      <View className="flex-row items-center justify-between">
        <Text variant="h4">{title}</Text>
        <Button size="sm" onPress={onAdd}>
          <Text>{addLabel}</Text>
        </Button>
      </View>
      <ListingLimitNotice business={business} />
      {rows.length === 0 && <EmptyList message={emptyMessage} />}
      {rows.map((row) => (
        <ListingCard
          key={row.id}
          title={row.title}
          priceLabel={row.priceLabel}
          image={row.image}
          badge={STATUS_LABELS[row.status]}
          onPress={() => onOpen(row.id)}
        />
      ))}
      <LoadMoreButton
        hasNextPage={query.hasNextPage}
        isFetching={query.isFetchingNextPage}
        onPress={() => query.fetchNextPage()}
      />
    </ScrollView>
  );
}

/** `hub/products`: the owner's products, drafts included. */
export function MyProductsScreen() {
  const query = useMyProducts();
  const rows = flattenPages(query.data).map((product) => ({
    id: product.id,
    title: product.title,
    priceLabel: productPriceLabel(product),
    image: product.images[0],
    status: product.status,
  }));
  return (
    <ListingsLayout
      title="Products"
      addLabel="Add product"
      emptyMessage="You haven't added any products yet."
      rows={rows}
      query={query}
      onAdd={() => router.push('/hub/products/new')}
      onOpen={(id) => router.push({ pathname: '/hub/products/[id]', params: { id } })}
    />
  );
}

/** `hub/services`: the owner's services, drafts included. */
export function MyServicesScreen() {
  const query = useMyServices();
  const rows = flattenPages(query.data).map((service) => ({
    id: service.id,
    title: service.title,
    priceLabel: servicePriceLabel(service),
    image: service.images[0],
    status: service.status,
  }));
  return (
    <ListingsLayout
      title="Services"
      addLabel="Add service"
      emptyMessage="You haven't added any services yet."
      rows={rows}
      query={query}
      onAdd={() => router.push('/hub/services/new')}
      onOpen={(id) => router.push({ pathname: '/hub/services/[id]', params: { id } })}
    />
  );
}
