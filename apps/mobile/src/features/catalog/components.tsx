import type { BusinessSummary, Media } from '@supporters/shared';
import { Badge } from '@supporters/ui-native/components/badge';
import { Button } from '@supporters/ui-native/components/button';
import { Card } from '@supporters/ui-native/components/card';
import { Skeleton } from '@supporters/ui-native/components/skeleton';
import { Text } from '@supporters/ui-native/components/text';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Image, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { CenteredMessage } from '../../components/centered-message';
import { ApiError, ApiErrorCode, messageForError } from '../../lib/api';

/** Loading, not found and failed states for a screen backed by one query. */
export function QueryState({
  isLoading,
  error,
  onRetry,
  notFoundTitle = 'Not found',
}: {
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  notFoundTitle?: string;
}) {
  if (isLoading) {
    return (
      <View className="bg-background flex-1 gap-4 p-4" accessibilityLabel="Loading">
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </View>
    );
  }
  if (error instanceof ApiError && error.code === ApiErrorCode.NotFound) {
    return (
      <CenteredMessage
        title={notFoundTitle}
        description="It may have been removed, or the link is wrong."
        actionLabel="Go to Home"
        onAction={() => router.replace('/')}
      />
    );
  }
  return (
    <CenteredMessage
      title="Couldn't load this"
      description={messageForError(error)}
      actionLabel="Try again"
      onAction={onRetry}
    />
  );
}

/** Swipeable listing photos, full width. */
export function ImageGallery({ images, label }: { images: Media[]; label: string }) {
  const { width } = useWindowDimensions();
  if (images.length === 0) {
    return (
      <View className="bg-muted h-64 w-full items-center justify-center">
        <Text variant="muted">No photos yet</Text>
      </View>
    );
  }
  return (
    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
      {images.map((image, index) => (
        <Image
          key={image.id}
          source={{ uri: image.url }}
          style={{ width, height: 280 }}
          resizeMode="cover"
          accessibilityLabel={`${label}, photo ${index + 1} of ${images.length}`}
        />
      ))}
    </ScrollView>
  );
}

/** A compact listing row: first photo, title, price and an optional status. */
export function ListingCard({
  title,
  priceLabel,
  image,
  badge,
  onPress,
}: {
  title: string;
  priceLabel: string;
  image: Media | undefined;
  badge?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
      <Card className="flex-row gap-3 p-3">
        {image ? (
          <Image
            source={{ uri: image.url }}
            className="bg-muted h-20 w-20 rounded-lg"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View className="bg-muted h-20 w-20 rounded-lg" />
        )}
        <View className="flex-1 justify-center gap-1">
          <Text className="font-semibold" numberOfLines={2}>
            {title}
          </Text>
          <Text className="text-primary text-sm font-semibold">{priceLabel}</Text>
          {badge && (
            <Badge variant="secondary" className="self-start">
              <Text>{badge}</Text>
            </Badge>
          )}
        </View>
      </Card>
    </Pressable>
  );
}

/** The seller box on listing pages; opens the business page. */
export function SellerCard({ business }: { business: BusinessSummary }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/business/[slug]', params: { slug: business.slug } })}
      accessibilityRole="link"
      accessibilityLabel={`Seller: ${business.name}`}
    >
      <Card className="flex-row items-center gap-3 p-3">
        {business.logo ? (
          <Image source={{ uri: business.logo.url }} className="h-12 w-12 rounded-full" />
        ) : (
          <View className="bg-muted h-12 w-12 rounded-full" />
        )}
        <View className="flex-1">
          <Text className="font-semibold">{business.name}</Text>
          <Text variant="muted">{business.city.name}</Text>
        </View>
        {business.isVerified && (
          <Badge>
            <Text>Verified</Text>
          </Badge>
        )}
      </Card>
    </Pressable>
  );
}

/** A label and its value, one per line. Empty values are skipped. */
export function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View className="border-border flex-row justify-between gap-4 border-b py-2">
      <Text variant="muted">{label}</Text>
      <Text className="flex-1 text-right">{value}</Text>
    </View>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text variant="large">{title}</Text>
      {children}
    </View>
  );
}

/** A centred note for an empty list. */
export function EmptyList({ message }: { message: string }) {
  return (
    <View className="items-center px-6 py-10">
      <Text variant="muted" className="text-center">
        {message}
      </Text>
    </View>
  );
}

/** "Load more" for infinite lists. */
export function LoadMoreButton({
  hasNextPage,
  isFetching,
  onPress,
}: {
  hasNextPage: boolean;
  isFetching: boolean;
  onPress: () => void;
}) {
  if (!hasNextPage) return null;
  return (
    <Button variant="outline" onPress={onPress} disabled={isFetching}>
      <Text>{isFetching ? 'Loading…' : 'Load more'}</Text>
    </Button>
  );
}
