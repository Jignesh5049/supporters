import React from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { CheckCircle2, MapPin } from 'lucide-react-native';
import type { BusinessCard, ListingResult, PostCard, SearchHit } from '@supporters/shared';
import { Avatar, AvatarFallback, AvatarImage } from '@supporters/ui-native/components/avatar';
import { Badge } from '@supporters/ui-native/components/badge';
import { Icon } from '@supporters/ui-native/components/icon';
import { Text } from '@supporters/ui-native/components/text';
import { availabilityLabel, listingPriceLabel } from '../labels';

const seg = encodeURIComponent;

const BUSINESS_TYPES: Record<BusinessCard['type'], string> = {
  manufacturer: 'Manufacturer',
  wholesaler: 'Wholesaler',
  retailer: 'Retailer',
  distributor: 'Distributor',
  brand: 'Brand',
  service_provider: 'Service provider',
};

const initials = (name: string) =>
  name
    .split(' ')
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

function Logo({ name, url, size = 'size-11' }: { name: string; url?: string; size?: string }) {
  return (
    <Avatar alt={name} className={`${size} rounded-xl`}>
      {url ? <AvatarImage source={{ uri: url }} /> : null}
      <AvatarFallback className="bg-primary/10 rounded-xl">
        <Text className="text-primary text-sm font-bold">{initials(name)}</Text>
      </AvatarFallback>
    </Avatar>
  );
}

export function BusinessResultRow({ business }: { business: BusinessCard }) {
  return (
    <Pressable
      onPress={() => router.push(`/business/${seg(business.slug)}`)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${business.name}`}
      className="border-border min-h-11 flex-row items-center gap-3 border-b px-4 py-3"
    >
      <Logo name={business.name} url={business.logo?.url} />
      <View className="flex-1 gap-0.5">
        <View className="flex-row items-center gap-1.5">
          <Text className="flex-shrink text-sm font-semibold" numberOfLines={1}>
            {business.name}
          </Text>
          {business.isVerified ? (
            <Icon
              as={CheckCircle2}
              size={13}
              className="text-primary"
              accessibilityLabel="Verified"
            />
          ) : null}
        </View>
        <Text variant="muted" className="text-xs" numberOfLines={1}>
          {BUSINESS_TYPES[business.type]} · {business.category.name}
        </Text>
        <View className="flex-row items-center gap-1">
          <Icon as={MapPin} size={11} className="text-muted-foreground" />
          <Text variant="muted" className="text-xs">
            {business.city.name}, {business.state.code} · {business.followerCount}{' '}
            {business.followerCount === 1 ? 'follower' : 'followers'}
          </Text>
        </View>
      </View>
      <Badge variant="outline">
        <Text>{business.rating === null ? 'New' : `★ ${business.rating.toFixed(1)}`}</Text>
      </Badge>
    </Pressable>
  );
}

export function ListingResultRow({ listing }: { listing: ListingResult }) {
  return (
    <Pressable
      onPress={() => router.push(`/${listing.kind}/${seg(listing.id)}`)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${listing.title}`}
      className="border-border min-h-11 flex-row items-center gap-3 border-b px-4 py-3"
    >
      {listing.image ? (
        <Image
          source={{ uri: listing.image.url }}
          style={{ width: 64, height: 64, borderRadius: 8 }}
          contentFit="cover"
          cachePolicy="disk"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View className="bg-muted size-16 rounded-lg" />
      )}
      <View className="flex-1 gap-0.5">
        <Text className="text-sm font-semibold" numberOfLines={2}>
          {listing.title}
        </Text>
        <Text variant="muted" className="text-xs" numberOfLines={1}>
          {listing.business.name} · {listing.business.city.name}
        </Text>
        <Text className="text-primary text-xs font-semibold">{listingPriceLabel(listing)}</Text>
        <Text variant="muted" className="text-xs">
          {availabilityLabel(listing)}
          {listing.moq !== null ? ` · MOQ ${listing.moq.toLocaleString('en-IN')}` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

export function PostResultRow({ post }: { post: PostCard }) {
  return (
    <Pressable
      onPress={() => router.push(`/post/${seg(post.id)}`)}
      accessibilityRole="button"
      accessibilityLabel={`Open post by ${post.business.name}`}
      className="border-border min-h-11 gap-2 border-b px-4 py-3"
    >
      <View className="flex-row items-center gap-2">
        <Logo name={post.business.name} url={post.business.logo?.url} size="size-8" />
        <Text className="flex-1 text-sm font-semibold" numberOfLines={1}>
          {post.business.name}
        </Text>
        {post.offerTag ? (
          <Badge>
            <Text>{post.offerTag}</Text>
          </Badge>
        ) : null}
      </View>
      <Text className="text-sm" numberOfLines={3}>
        {post.excerpt}
      </Text>
      <Text variant="muted" className="text-xs">
        {post.likeCount} likes · {post.commentCount} comments
      </Text>
    </Pressable>
  );
}

export function SearchHitRow({ hit }: { hit: SearchHit }) {
  switch (hit.type) {
    case 'business':
      return <BusinessResultRow business={hit.business} />;
    case 'product':
    case 'service':
      return <ListingResultRow listing={hit.listing} />;
    case 'post':
      return <PostResultRow post={hit.post} />;
  }
}
