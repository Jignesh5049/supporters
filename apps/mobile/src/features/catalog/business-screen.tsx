import { businessSlugSchema, type Business } from '@supporters/shared';
import { Badge } from '@supporters/ui-native/components/badge';
import { Button } from '@supporters/ui-native/components/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@supporters/ui-native/components/tabs';
import { Text } from '@supporters/ui-native/components/text';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, ScrollView, View } from 'react-native';
import { useApp } from '../../context/AppContext';
import { parseRouteParam } from '../../lib/navigation/params';
import { useRequireSession } from '../navigation/use-require-session';
import {
  DetailRow,
  EmptyList,
  ListingCard,
  LoadMoreButton,
  QueryState,
  Section,
} from './components';
import { BUSINESS_TYPE_LABELS, productPriceLabel, servicePriceLabel } from './format';
import { flattenPages, useBusiness, useBusinessProducts, useBusinessServices } from './queries';

const BusinessTab = {
  Products: 'products',
  Services: 'services',
  Posts: 'posts',
  Reviews: 'reviews',
} as const;
type BusinessTab = (typeof BusinessTab)[keyof typeof BusinessTab];

/** `business/[slug]`: the public business page (mobile spec, Structure). */
export function BusinessScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const query = useBusiness(parseRouteParam(businessSlugSchema, slug));

  if (!query.data) {
    return (
      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        notFoundTitle="Business not found"
      />
    );
  }
  return <BusinessPage business={query.data} />;
}

function BusinessPage({ business }: { business: Business }) {
  const [tab, setTab] = useState<BusinessTab>(BusinessTab.Products);
  const { openEnquiryModal } = useApp();
  const requireSession = useRequireSession();

  const handleEnquire = () =>
    requireSession(() =>
      openEnquiryModal({
        title: business.name,
        businessName: business.name,
        businessId: business.id,
      }),
    );

  return (
    <ScrollView className="bg-background flex-1" contentContainerClassName="pb-10">
      {business.cover ? (
        <Image
          source={{ uri: business.cover.url }}
          className="bg-muted h-40 w-full"
          accessibilityLabel={`${business.name} cover photo`}
        />
      ) : (
        <View className="bg-primary-soft h-28 w-full" />
      )}

      <View className="gap-4 px-4">
        <View className="-mt-10 flex-row items-end gap-3">
          {business.logo ? (
            <Image
              source={{ uri: business.logo.url }}
              className="border-background h-20 w-20 rounded-full border-4"
              accessibilityLabel={`${business.name} logo`}
            />
          ) : (
            <View className="border-background bg-muted h-20 w-20 rounded-full border-4" />
          )}
        </View>

        <View className="gap-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text variant="h4">{business.name}</Text>
            {business.isVerified && (
              <Badge>
                <Text>Verified</Text>
              </Badge>
            )}
          </View>
          <Text variant="muted">
            {BUSINESS_TYPE_LABELS[business.type]} · {business.category.name} · {business.city.name},{' '}
            {business.state.name}
          </Text>
        </View>

        <Button onPress={handleEnquire} accessibilityHint="Send this business an enquiry">
          <Text>Send enquiry</Text>
        </Button>

        {business.about && <Text>{business.about}</Text>}

        {(business.contactPhone || business.contactEmail || business.address) && (
          <Section title="Contact">
            <DetailRow label="Contact person" value={business.contactPerson} />
            <DetailRow label="Phone" value={business.contactPhone} />
            <DetailRow label="Email" value={business.contactEmail} />
            <DetailRow
              label="Address"
              value={[business.address, business.pincode].filter(Boolean).join(' ')}
            />
          </Section>
        )}

        <Tabs value={tab} onValueChange={(value) => setTab(value as BusinessTab)}>
          <TabsList className="w-full">
            <TabsTrigger value={BusinessTab.Products} className="flex-1">
              <Text>Products</Text>
            </TabsTrigger>
            <TabsTrigger value={BusinessTab.Services} className="flex-1">
              <Text>Services</Text>
            </TabsTrigger>
            <TabsTrigger value={BusinessTab.Posts} className="flex-1">
              <Text>Posts</Text>
            </TabsTrigger>
            <TabsTrigger value={BusinessTab.Reviews} className="flex-1">
              <Text>Reviews</Text>
            </TabsTrigger>
          </TabsList>
          <TabsContent value={BusinessTab.Products}>
            <BusinessProducts businessId={business.id} />
          </TabsContent>
          <TabsContent value={BusinessTab.Services}>
            <BusinessServices businessId={business.id} />
          </TabsContent>
          <TabsContent value={BusinessTab.Posts}>
            <EmptyList message={`${business.name} hasn't posted yet.`} />
          </TabsContent>
          <TabsContent value={BusinessTab.Reviews}>
            <EmptyList message="No reviews yet." />
          </TabsContent>
        </Tabs>
      </View>
    </ScrollView>
  );
}

function BusinessProducts({ businessId }: { businessId: string }) {
  const query = useBusinessProducts(businessId);
  const products = flattenPages(query.data);
  if (query.isLoading) return <EmptyList message="Loading products…" />;
  if (query.isError) return <EmptyList message="Couldn't load products. Try again later." />;
  if (products.length === 0) return <EmptyList message="No products listed yet." />;
  return (
    <View className="gap-3">
      {products.map((product) => (
        <ListingCard
          key={product.id}
          title={product.title}
          priceLabel={productPriceLabel(product)}
          image={product.images[0]}
          onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}
        />
      ))}
      <LoadMoreButton
        hasNextPage={query.hasNextPage}
        isFetching={query.isFetchingNextPage}
        onPress={() => void query.fetchNextPage()}
      />
    </View>
  );
}

function BusinessServices({ businessId }: { businessId: string }) {
  const query = useBusinessServices(businessId);
  const services = flattenPages(query.data);
  if (query.isLoading) return <EmptyList message="Loading services…" />;
  if (query.isError) return <EmptyList message="Couldn't load services. Try again later." />;
  if (services.length === 0) return <EmptyList message="No services listed yet." />;
  return (
    <View className="gap-3">
      {services.map((service) => (
        <ListingCard
          key={service.id}
          title={service.title}
          priceLabel={servicePriceLabel(service)}
          image={service.images[0]}
          onPress={() => router.push({ pathname: '/service/[id]', params: { id: service.id } })}
        />
      ))}
      <LoadMoreButton
        hasNextPage={query.hasNextPage}
        isFetching={query.isFetchingNextPage}
        onPress={() => void query.fetchNextPage()}
      />
    </View>
  );
}
