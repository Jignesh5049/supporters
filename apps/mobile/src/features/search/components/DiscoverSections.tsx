import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import type {
  BusinessCard,
  CategoryTree,
  DiscoverResponse,
  ListingResult,
} from '@supporters/shared';
import { Text } from '@supporters/ui-native/components/text';
import { BusinessResultRow, ListingResultRow } from './ResultRows';

/** `/search` with route params, e.g. a category or a city. */
export function searchPath(params: Record<string, string>): string {
  const query = new URLSearchParams(params).toString();
  return query ? `/search?${query}` : '/search';
}

interface DiscoverSectionsProps {
  discover: DiscoverResponse;
  categories: CategoryTree[];
  isSignedIn: boolean;
}

/** Category chips, then each Discover row that has items. */
export function DiscoverSections({ discover, categories, isSignedIn }: DiscoverSectionsProps) {
  const { trending, featured, nearYou, suggested } = discover;
  return (
    <View className="gap-6">
      {categories.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 px-4"
          accessibilityLabel="Browse by category"
        >
          {categories.map((category) => (
            <Pressable
              key={category.id}
              onPress={() => router.push(searchPath({ category: category.slug }))}
              accessibilityRole="button"
              accessibilityLabel={`Browse ${category.name}`}
              className="border-border bg-card min-h-11 justify-center rounded-full border px-4"
            >
              <Text className="text-sm font-semibold">{category.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      {isSignedIn ? (
        <BusinessSection
          title="Suggested for you"
          description="In your interests, not followed yet"
          businesses={suggested}
        />
      ) : null}
      <BusinessSection
        title="Trending"
        description="Most new followers and enquiries this week"
        businesses={trending}
      />
      <ListingSection title="Featured" description="From Premium businesses" listings={featured} />
      {nearYou.city ? (
        <BusinessSection
          title={`Near you in ${nearYou.city.name}`}
          businesses={nearYou.data}
          moreHref={searchPath({ city: nearYou.city.id, state: nearYou.city.stateCode })}
        />
      ) : null}
    </View>
  );
}

function SectionHeader({
  title,
  description,
  moreHref,
}: {
  title: string;
  description?: string | undefined;
  moreHref?: string | undefined;
}) {
  return (
    <View className="flex-row items-end justify-between px-4 pb-1">
      <View className="flex-1">
        <Text accessibilityRole="header" className="text-base font-bold">
          {title}
        </Text>
        {description ? (
          <Text variant="muted" className="text-xs">
            {description}
          </Text>
        ) : null}
      </View>
      {moreHref ? (
        <Pressable
          onPress={() => router.push(moreHref)}
          accessibilityRole="link"
          hitSlop={12}
          className="min-h-11 justify-center"
        >
          <Text className="text-primary text-sm font-semibold">See all</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function BusinessSection(props: {
  title: string;
  description?: string;
  moreHref?: string;
  businesses: BusinessCard[];
}) {
  if (props.businesses.length === 0) return null;
  return (
    <View>
      <SectionHeader {...props} />
      {props.businesses.map((business) => (
        <BusinessResultRow key={business.id} business={business} />
      ))}
    </View>
  );
}

function ListingSection(props: { title: string; description?: string; listings: ListingResult[] }) {
  if (props.listings.length === 0) return null;
  return (
    <View>
      <SectionHeader {...props} />
      {props.listings.map((listing) => (
        <ListingResultRow key={`${listing.kind}-${listing.id}`} listing={listing} />
      ))}
    </View>
  );
}
