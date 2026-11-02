import type { Product } from '@supporters/shared';
import { Button } from '@supporters/ui-native/components/button';
import { Text } from '@supporters/ui-native/components/text';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { z } from 'zod';
import { useApp } from '../../context/AppContext';
import { parseRouteParam } from '../../lib/navigation/params';
import { useRequireSession } from '../navigation/use-require-session';
import { DetailRow, ImageGallery, QueryState, Section, SellerCard } from './components';
import {
  PRODUCT_AVAILABILITY_LABELS,
  areaLabel,
  formatPrice,
  humanize,
  productPriceLabel,
} from './format';
import { useProduct } from './queries';

/** `product/[id]`: a published product (mobile spec, Structure). */
export function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useProduct(parseRouteParam(z.uuid(), id));

  if (!query.data) {
    return (
      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        notFoundTitle="Product not found"
      />
    );
  }
  return <ProductPage product={query.data} />;
}

function ProductPage({ product }: { product: Product }) {
  const { openEnquiryModal } = useApp();
  const requireSession = useRequireSession();

  const handleEnquire = () =>
    requireSession(() =>
      openEnquiryModal({
        title: product.title,
        businessName: product.business.name,
        businessId: product.business.id,
      }),
    );

  return (
    <ScrollView className="bg-background flex-1" contentContainerClassName="pb-10">
      <ImageGallery images={product.images} label={product.title} />
      <View className="gap-5 p-4">
        <View className="gap-1">
          <Text variant="h4">{product.title}</Text>
          <Text className="text-primary text-xl font-semibold">{productPriceLabel(product)}</Text>
          {product.originalPrice && product.price && (
            <Text variant="muted" className="line-through">
              {formatPrice(product.originalPrice)}
            </Text>
          )}
          <Text variant="muted">{product.category.name}</Text>
        </View>

        <Button onPress={handleEnquire} accessibilityHint="Ask the seller about this product">
          <Text>{product.price ? 'Send enquiry' : 'Ask for price'}</Text>
        </Button>

        <SellerCard business={product.business} />

        <Section title="Details">
          <DetailRow
            label="Availability"
            value={PRODUCT_AVAILABILITY_LABELS[product.availability]}
          />
          <DetailRow
            label="Minimum order"
            value={
              product.moq === null
                ? null
                : `${product.moq}${product.unit ? ` ${humanize(product.unit)}` : ''}`
            }
          />
          <DetailRow label="Delivery time" value={product.deliveryTime} />
          <DetailRow label="Ships to" value={areaLabel(product.shippingArea)} />
          {product.specs.map((spec) => (
            <DetailRow key={spec.key} label={spec.key} value={spec.value} />
          ))}
        </Section>

        <Section title="Description">
          <Text>{product.description}</Text>
        </Section>
      </View>
    </ScrollView>
  );
}
