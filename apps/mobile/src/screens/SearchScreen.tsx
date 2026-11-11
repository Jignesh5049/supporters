import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, SearchX, SlidersHorizontal } from 'lucide-react-native';
import type { SearchHit, SearchType } from '@supporters/shared';
import { Badge } from '@supporters/ui-native/components/badge';
import { Button } from '@supporters/ui-native/components/button';
import { Icon } from '@supporters/ui-native/components/icon';
import { Tabs, TabsList, TabsTrigger } from '@supporters/ui-native/components/tabs';
import { Text } from '@supporters/ui-native/components/text';
import { EmptyState } from '@supporters/ui-native/patterns';
import { messageForError } from '../lib/api';
import { OptionPicker } from '../features/hub/components/OptionPicker';
import { FilterSheet } from '../features/search/components/FilterSheet';
import { SearchHitRow } from '../features/search/components/ResultRows';
import { SearchBar } from '../features/search/components/SearchBar';
import { flattenHits, hitId, useSearchResults } from '../features/search/hooks';
import {
  type SearchState,
  TYPE_TABS,
  activeFilterCount,
  clearFilters,
  fromRouteParams,
  sortOptions,
  withType,
} from '../features/search/search-state';

/** Search: box with autocomplete, type tabs, sort and a filter sheet, on `GET /v1/search`. */
export function SearchScreen() {
  const params = useLocalSearchParams();
  const [state, setState] = useState<SearchState>(() => fromRouteParams(params));
  const [isFilterOpen, setFilterOpen] = useState(false);
  const results = useSearchResults(state);
  const hits = flattenHits(results.data?.pages);
  const total = results.data?.pages[0]?.estimatedTotal ?? 0;
  const filterCount = activeFilterCount(state);

  return (
    <View className="bg-background flex-1">
      <View className="border-border gap-2 border-b px-4 pb-2 pt-3">
        <View className="flex-row items-start gap-2">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            accessibilityRole="button"
            accessibilityLabel="Back"
            className="size-11 items-center justify-center"
          >
            <Icon as={ArrowLeft} size={20} />
          </Pressable>
          <View className="flex-1">
            <SearchBar
              initialQuery={state.q}
              autoFocus={!state.q && !state.category}
              onSubmit={(q) => setState((current) => ({ ...current, q }))}
            />
          </View>
        </View>
        <Tabs
          value={state.type}
          onValueChange={(type) => setState((current) => withType(current, type as SearchType))}
        >
          <TabsList className="w-full flex-row">
            {TYPE_TABS.map((tab) => (
              <TabsTrigger key={tab.type} value={tab.type} className="flex-1">
                <Text>{tab.label}</Text>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <View className="flex-row items-center gap-2">
          <View className="flex-1">
            <OptionPicker
              title="Sort"
              placeholder="Relevance"
              options={sortOptions(state.type).map((option) => ({
                id: option.value,
                label: option.label,
              }))}
              value={state.sort}
              onChange={(sort) =>
                setState((current) => ({ ...current, sort: sort as SearchState['sort'] }))
              }
            />
          </View>
          <Button
            variant="outline"
            onPress={() => setFilterOpen(true)}
            accessibilityLabel={`Filters, ${filterCount} applied`}
          >
            <Icon as={SlidersHorizontal} size={16} />
            <Text>Filters</Text>
            {filterCount > 0 ? (
              <Badge>
                <Text>{filterCount}</Text>
              </Badge>
            ) : null}
          </Button>
        </View>
      </View>

      {results.isPending ? (
        <ActivityIndicator className="mt-8" />
      ) : results.isError && hits.length === 0 ? (
        <View className="items-center gap-3 p-8">
          <Text className="text-center">{messageForError(results.error)}</Text>
          <Button onPress={() => results.refetch()}>
            <Text>Try again</Text>
          </Button>
        </View>
      ) : (
        <FlatList<SearchHit>
          data={hits}
          keyExtractor={hitId}
          renderItem={({ item }) => <SearchHitRow hit={item} />}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 24 }}
          ListHeaderComponent={
            hits.length > 0 ? (
              <Text variant="muted" className="px-4 pt-3 text-xs" accessibilityLiveRegion="polite">
                {total >= 1000 ? '1,000+' : total} {total === 1 ? 'result' : 'results'}
              </Text>
            ) : undefined
          }
          ListEmptyComponent={
            <EmptyState
              icon={<SearchX size={32} color="#9CA3AF" />}
              title="No results"
              description={
                filterCount > 0
                  ? 'Nothing matches these filters. Try removing some.'
                  : 'Try other words, or check the spelling.'
              }
              actionLabel={filterCount > 0 ? 'Clear filters' : undefined}
              onAction={filterCount > 0 ? () => setState(clearFilters(state)) : undefined}
              className="mx-4 my-6"
            />
          }
          ListFooterComponent={
            results.isFetchingNextPage ? <ActivityIndicator className="my-4" /> : undefined
          }
          onEndReached={() => {
            if (results.hasNextPage && !results.isFetchingNextPage) void results.fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
        />
      )}

      <FilterSheet
        visible={isFilterOpen}
        state={state}
        onClose={() => setFilterOpen(false)}
        onApply={(next) => {
          setState(next);
          setFilterOpen(false);
        }}
      />
    </View>
  );
}
