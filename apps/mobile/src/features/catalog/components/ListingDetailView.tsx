import React, { useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ArrowLeft, Bookmark, Share2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BusinessSummary, Media } from '@supporters/shared';
import { Badge } from '@supporters/ui-native/components/badge';
import { Button } from '@supporters/ui-native/components/button';
import { Icon } from '@supporters/ui-native/components/icon';
import { Separator } from '@supporters/ui-native/components/separator';
import { Text } from '@supporters/ui-native/components/text';
import { BusinessRow } from '../../social/components/BusinessRow';

export interface ListingDetailViewProps {
  headerTitle: string;
  title: string;
  priceLabel: string;
  availabilityLabel: string;
  images: Media[];
  business: BusinessSummary;
  description: string;
  /** Label and value pairs, e.g. MOQ or turnaround. Empty values are skipped. */
  details: [string, string | null][];
  specs?: { key: string; value: string }[];
  features?: string[];
  isSaved: boolean;
  onToggleSave: () => void;
  onShare: () => void;
  onEnquiry: () => void;
  related?: React.ReactNode;
}

const WIDTH = Dimensions.get('window').width;

export function ListingDetailView(props: ListingDetailViewProps) {
  const { images, business, details, specs = [], features = [] } = props;
  const [index, setIndex] = useState(0);

  return (
    <SafeAreaView className="bg-background flex-1">
      <View className="border-border flex-row items-center gap-1 border-b px-2 py-1">
        <Button
          variant="ghost"
          size="icon"
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <Icon as={ArrowLeft} size={20} />
        </Button>
        <Text className="flex-1 text-base font-semibold" numberOfLines={1}>
          {props.headerTitle}
        </Text>
        <Button
          variant="ghost"
          size="icon"
          onPress={props.onToggleSave}
          accessibilityLabel={props.isSaved ? 'Remove from saved' : 'Save'}
          accessibilityState={{ selected: props.isSaved }}
        >
          <Icon
            as={Bookmark}
            size={20}
            className={props.isSaved ? 'text-primary fill-primary' : 'text-foreground'}
          />
        </Button>
        <Button variant="ghost" size="icon" onPress={props.onShare} accessibilityLabel="Share">
          <Icon as={Share2} size={19} />
        </Button>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {images.length > 0 ? (
          <View>
            <FlatList
              data={images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(image) => image.id}
              onMomentumScrollEnd={(event) =>
                setIndex(Math.round(event.nativeEvent.contentOffset.x / WIDTH))
              }
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item.url }}
                  style={{ width: WIDTH, aspectRatio: 4 / 3 }}
                  contentFit="cover"
                  cachePolicy="disk"
                  accessibilityLabel={props.title}
                />
              )}
            />
            {images.length > 1 ? (
              <View className="bg-foreground/70 absolute bottom-2 right-2 rounded-full px-2 py-0.5">
                <Text className="text-background text-xs font-semibold">
                  {index + 1}/{images.length}
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View className="bg-muted w-full" style={{ aspectRatio: 4 / 3 }} />
        )}

        <View className="gap-2 p-4">
          <Text variant="h4">{props.title}</Text>
          <Text className="text-primary text-xl font-bold">{props.priceLabel}</Text>
          <Badge variant="secondary" className="self-start">
            <Text className="text-xs">{props.availabilityLabel}</Text>
          </Badge>
        </View>

        <Separator />
        <View className="gap-2 p-4">
          {details.map(([label, value]) =>
            value ? (
              <View key={label} className="flex-row gap-2">
                <Text variant="muted" className="w-28 text-sm">
                  {label}
                </Text>
                <Text className="flex-1 text-sm">{value}</Text>
              </View>
            ) : null,
          )}
        </View>

        {props.description ? (
          <View className="gap-1 px-4 pb-4">
            <Text className="text-sm font-semibold">Description</Text>
            <Text className="text-sm leading-relaxed">{props.description}</Text>
          </View>
        ) : null}

        {features.length > 0 ? (
          <View className="gap-1 px-4 pb-4">
            <Text className="text-sm font-semibold">What is included</Text>
            {features.map((feature) => (
              <Text key={feature} className="text-sm">
                • {feature}
              </Text>
            ))}
          </View>
        ) : null}

        {specs.length > 0 ? (
          <View className="gap-1 px-4 pb-4">
            <Text className="text-sm font-semibold">Specifications</Text>
            {specs.map((spec) => (
              <View key={spec.key} className="border-border flex-row border-b py-1.5">
                <Text variant="muted" className="w-36 text-sm">
                  {spec.key}
                </Text>
                <Text className="flex-1 text-sm">{spec.value}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Separator />
        <Text className="px-4 pt-3 text-sm font-semibold">Supplier</Text>
        <BusinessRow
          business={business}
          onPress={(b) => router.push(`/business/${encodeURIComponent(b.slug)}`)}
        />
        {props.related}
        <View className="h-24" />
      </ScrollView>

      <View className="border-border bg-background border-t p-3">
        <Button onPress={props.onEnquiry} accessibilityLabel="Send enquiry">
          <Text>Send enquiry</Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}

export function ListingDetailState({
  title,
  message,
  isLoading,
  onRetry,
}: {
  title: string;
  message?: string;
  isLoading?: boolean;
  onRetry?: () => void;
}) {
  return (
    <SafeAreaView className="bg-background flex-1">
      <View className="border-border flex-row items-center gap-1 border-b px-2 py-1">
        <Button
          variant="ghost"
          size="icon"
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <Icon as={ArrowLeft} size={20} />
        </Button>
        <Text className="text-base font-semibold">{title}</Text>
      </View>
      {isLoading ? (
        <ActivityIndicator className="mt-8" />
      ) : (
        <View className="items-center gap-3 p-8">
          <Text className="text-center text-base font-semibold">{message}</Text>
          {onRetry ? (
            <Button onPress={onRetry}>
              <Text>Try again</Text>
            </Button>
          ) : null}
        </View>
      )}
    </SafeAreaView>
  );
}
