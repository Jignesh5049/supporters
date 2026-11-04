import React from 'react';
import { ActivityIndicator, Linking, View } from 'react-native';
import type { UseInfiniteQueryResult } from '@tanstack/react-query';
import type { Business, Page } from '@supporters/shared';
import { Button } from '@supporters/ui-native/components/button';
import { Text } from '@supporters/ui-native/components/text';
import { messageForError } from '../../../lib/api';
import { PostCard } from '../../feed/components/PostCard';
import { useBusinessPosts } from '../../feed/hooks';
import { usePostActions } from '../../feed/use-post-actions';
import { useBusinessProducts, useBusinessServices } from '../../catalog/hooks';
import { ListingRow } from '../../social/components/ListingRow';
import { toPostCardModel } from '../../social/mappers';
import { dayLabel, safeWebUrl } from '../labels';

type InfiniteList<T> = UseInfiniteQueryResult<{ pages: Page<T>[]; pageParams: unknown[] }, Error>;

function ListState<T>({
  query,
  empty,
  children,
}: {
  query: InfiniteList<T>;
  empty: string;
  children: (items: T[]) => React.ReactNode;
}) {
  if (query.isPending) return <ActivityIndicator className="my-8" />;
  if (query.isError && !query.data) {
    return (
      <View className="items-center gap-3 p-8">
        <Text className="text-center">{messageForError(query.error)}</Text>
        <Button onPress={() => query.refetch()}>
          <Text>Try again</Text>
        </Button>
      </View>
    );
  }
  const items = query.data?.pages.flatMap((page) => page.data) ?? [];
  if (items.length === 0) {
    return (
      <Text variant="muted" className="p-8 text-center">
        {empty}
      </Text>
    );
  }
  return (
    <View>
      {children(items)}
      {query.hasNextPage ? (
        <Button
          variant="outline"
          className="mx-4 my-3"
          disabled={query.isFetchingNextPage}
          onPress={() => query.fetchNextPage()}
        >
          <Text>{query.isFetchingNextPage ? 'Loading' : 'Load more'}</Text>
        </Button>
      ) : null}
    </View>
  );
}

const seg = encodeURIComponent;

export function BusinessProductsTab({
  businessId,
  onOpen,
}: {
  businessId: string;
  onOpen: (path: string) => void;
}) {
  const query = useBusinessProducts(businessId);
  return (
    <ListState query={query} empty="No products listed yet.">
      {(items) =>
        items.map((product) => (
          <ListingRow
            key={product.id}
            listing={product}
            onPress={() => onOpen(`/product/${seg(product.id)}`)}
          />
        ))
      }
    </ListState>
  );
}

export function BusinessServicesTab({
  businessId,
  onOpen,
}: {
  businessId: string;
  onOpen: (path: string) => void;
}) {
  const query = useBusinessServices(businessId);
  return (
    <ListState query={query} empty="No services listed yet.">
      {(items) =>
        items.map((service) => (
          <ListingRow
            key={service.id}
            listing={service}
            onPress={() => onOpen(`/service/${seg(service.id)}`)}
          />
        ))
      }
    </ListState>
  );
}

export function BusinessPostsTab({ businessId }: { businessId: string }) {
  const query = useBusinessPosts(businessId);
  const actions = usePostActions();
  return (
    <View className="pt-3">
      <ListState query={query} empty="This business has not shared any updates yet.">
        {(posts) =>
          posts.map((post) => <PostCard key={post.id} post={toPostCardModel(post)} {...actions} />)
        }
      </ListState>
    </View>
  );
}

export function BusinessAboutTab({ business }: { business: Business }) {
  const website = safeWebUrl(business.website);
  const rows: [string, string | null][] = [
    ['Established', business.establishedYear ? String(business.establishedYear) : null],
    ['GSTIN', business.gstin],
    ['Address', [business.address, business.pincode].filter(Boolean).join(' - ') || null],
    ['Contact', business.contactPerson],
    ['Phone', business.contactPhone],
    ['Email', business.contactEmail],
  ];
  return (
    <View className="gap-4 p-4">
      {business.about ? <Text className="text-sm leading-relaxed">{business.about}</Text> : null}
      <View className="gap-2">
        {rows.map(([label, value]) =>
          value ? (
            <View key={label} className="flex-row gap-2">
              <Text variant="muted" className="w-24 text-sm">
                {label}
              </Text>
              <Text className="flex-1 text-sm">{value}</Text>
            </View>
          ) : null,
        )}
        {website ? (
          <View className="flex-row gap-2">
            <Text variant="muted" className="w-24 text-sm">
              Website
            </Text>
            <Text
              className="text-primary flex-1 text-sm underline"
              onPress={() => Linking.openURL(website).catch(() => undefined)}
              accessibilityRole="link"
            >
              {business.website}
            </Text>
          </View>
        ) : null}
      </View>
      {business.openingHours.length > 0 ? (
        <View className="gap-1">
          <Text className="text-sm font-semibold">Opening hours</Text>
          {business.openingHours.map((slot) => (
            <View key={slot.day} className="flex-row justify-between">
              <Text variant="muted" className="text-sm">
                {dayLabel(slot.day)}
              </Text>
              <Text className="text-sm">
                {slot.opens} - {slot.closes}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {business.tags.length > 0 ? (
        <Text variant="muted" className="text-xs">
          {business.tags.join(' · ')}
        </Text>
      ) : null}
    </View>
  );
}
