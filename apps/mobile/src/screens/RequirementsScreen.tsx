import React, { useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ClipboardList, Inbox, Plus } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Requirement, RequirementStatus } from '@supporters/shared';
import { Button } from '@supporters/ui-native/components/button';
import { Icon } from '@supporters/ui-native/components/icon';
import { Tabs, TabsList, TabsTrigger } from '@supporters/ui-native/components/tabs';
import { Text } from '@supporters/ui-native/components/text';
import { messageForError } from '../lib/api';
import { useMyBusiness } from '../features/business/hooks';
import { QuoteSheet, RequirementCard } from '../features/requirements/components';
import { ScreenHeader } from '../features/requirements/components/ScreenHeader';
import { RequirementOwnerActions } from '../features/requirements/components/RequirementOwnerActions';
import { useMatchedRequirements, useMyRequirements } from '../features/requirements/hooks';
import { REQUIREMENT_STATUS_LABEL } from '../features/requirements/requirement-form';

type Tab = 'matched' | 'mine';

const FILTERS: { label: string; status: RequirementStatus | null }[] = [
  { label: 'All', status: null },
  { label: REQUIREMENT_STATUS_LABEL.open, status: 'open' },
  { label: REQUIREMENT_STATUS_LABEL.fulfilled, status: 'fulfilled' },
  { label: REQUIREMENT_STATUS_LABEL.closed, status: 'closed' },
  { label: REQUIREMENT_STATUS_LABEL.expired, status: 'expired' },
];

/** Requirements: matched to my business, and the ones I posted (product spec, Buyer requirements). */
export function RequirementsScreen() {
  const router = useRouter();
  const myBusiness = useMyBusiness();
  const hasBusiness = Boolean(myBusiness.data);
  const isVerified = myBusiness.data?.verificationStatus === 'verified';
  const [tab, setTab] = useState<Tab>('matched');
  const activeTab: Tab = hasBusiness ? tab : 'mine';

  return (
    <SafeAreaView className="bg-background flex-1" edges={['top']}>
      <ScreenHeader
        title="Buyer requirements"
        action={
          <Button
            size="sm"
            onPress={() => router.push('/requirements/new')}
            accessibilityLabel="Post a requirement"
          >
            <Icon as={Plus} size={16} className="text-primary-foreground" />
            <Text>Post</Text>
          </Button>
        }
      />
      {hasBusiness ? (
        <View className="border-border border-b px-4 py-2">
          <Tabs value={activeTab} onValueChange={(value) => setTab(value as Tab)}>
            <TabsList className="w-full">
              <TabsTrigger value="matched" className="flex-1">
                <Text>For your business</Text>
              </TabsTrigger>
              <TabsTrigger value="mine" className="flex-1">
                <Text>My requirements</Text>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </View>
      ) : null}
      {activeTab === 'matched' ? <MatchedList isVerified={isVerified} /> : <MyList />}
    </SafeAreaView>
  );
}

function MatchedList({ isVerified }: { isVerified: boolean }) {
  const router = useRouter();
  const query = useMatchedRequirements();
  const [quoting, setQuoting] = useState<Requirement | null>(null);
  return (
    <>
      <RequirementList
        query={query}
        header={
          !isVerified ? (
            <Text className="bg-warning-soft text-warning rounded-xl p-3 text-sm">
              Only verified businesses can quote. Request the badge from the Business Hub.
            </Text>
          ) : null
        }
        emptyIcon={Inbox}
        emptyTitle="No matching requirements"
        emptyText="When a buyer needs something in your category and area, it shows here."
        renderActions={(requirement) =>
          isVerified && requirement.status === 'open' && !requirement.hasQuoted ? (
            <Button size="sm" onPress={() => setQuoting(requirement)}>
              <Text>Send quote</Text>
            </Button>
          ) : null
        }
        onOpen={(requirement) => router.push(`/requirements/${requirement.id}`)}
      />
      <QuoteSheet requirement={quoting} onClose={() => setQuoting(null)} />
    </>
  );
}

function MyList() {
  const router = useRouter();
  const [status, setStatus] = useState<RequirementStatus | null>(null);
  const query = useMyRequirements(status);
  return (
    <RequirementList
      query={query}
      header={
        <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
          {FILTERS.map((filter) => (
            <Button
              key={filter.label}
              size="sm"
              variant={filter.status === status ? 'default' : 'outline'}
              onPress={() => setStatus(filter.status)}
              accessibilityRole="radio"
              accessibilityState={{ checked: filter.status === status }}
            >
              <Text>{filter.label}</Text>
            </Button>
          ))}
        </View>
      }
      emptyIcon={ClipboardList}
      emptyTitle="No requirements here"
      emptyText="Post what you need, and matching suppliers will send you quotes."
      renderActions={(requirement) => <RequirementOwnerActions requirement={requirement} />}
      onOpen={(requirement) => router.push(`/requirements/${requirement.id}`)}
    />
  );
}

function RequirementList({
  query,
  header,
  emptyIcon,
  emptyTitle,
  emptyText,
  renderActions,
  onOpen,
}: {
  query: ReturnType<typeof useMatchedRequirements>;
  header: React.ReactElement | null;
  emptyIcon: typeof Inbox;
  emptyTitle: string;
  emptyText: string;
  renderActions: (requirement: Requirement) => React.ReactNode;
  onOpen: (requirement: Requirement) => void;
}) {
  const items = query.data?.pages.flatMap((page) => page.data) ?? [];
  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerClassName="gap-3 p-4"
      ListHeaderComponent={header ?? undefined}
      renderItem={({ item }) => (
        <RequirementCard
          requirement={item}
          onPress={() => onOpen(item)}
          actions={renderActions(item)}
        />
      )}
      onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
      onEndReachedThreshold={0.5}
      refreshing={query.isRefetching && !query.isFetchingNextPage}
      onRefresh={() => query.refetch()}
      ListFooterComponent={
        query.isFetchingNextPage ? <ActivityIndicator className="my-4" /> : undefined
      }
      ListEmptyComponent={
        query.isPending ? (
          <ActivityIndicator className="mt-10" />
        ) : query.isError ? (
          <View className="items-center gap-3 py-10">
            <Text className="text-center">{messageForError(query.error)}</Text>
            <Button variant="outline" onPress={() => query.refetch()}>
              <Text>Try again</Text>
            </Button>
          </View>
        ) : (
          <View className="items-center gap-2 px-6 py-16">
            <Icon as={emptyIcon} size={36} className="text-muted-foreground" />
            <Text className="text-base font-bold">{emptyTitle}</Text>
            <Text variant="muted" className="text-center text-sm">
              {emptyText}
            </Text>
          </View>
        )
      }
    />
  );
}
