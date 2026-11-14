import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MessageSquare } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import type { Quote } from '@supporters/shared';
import { Badge } from '@supporters/ui-native/components/badge';
import { Button } from '@supporters/ui-native/components/button';
import { Icon } from '@supporters/ui-native/components/icon';
import { Text } from '@supporters/ui-native/components/text';
import { ApiError, ApiErrorCode, messageForError } from '../lib/api';
import { useMyBusiness } from '../features/business/hooks';
import { QuoteSheet, RequirementCard } from '../features/requirements/components';
import { RequirementOwnerActions } from '../features/requirements/components/RequirementOwnerActions';
import { ScreenHeader } from '../features/requirements/components/ScreenHeader';
import { useRequirement, useRequirementQuotes } from '../features/requirements/hooks';
import { formatPrice } from '../features/social/mappers';

/** One requirement: the buyer sees the quotes received; a matched seller can quote. */
export function RequirementDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = z.uuid().safeParse(rawId).success ? (rawId as string) : '';
  const router = useRouter();
  const query = useRequirement(id);
  const myBusiness = useMyBusiness();
  const isVerified = myBusiness.data?.verificationStatus === 'verified';
  const [isQuoting, setIsQuoting] = useState(false);

  if (!id || query.isError) {
    const isMissing =
      !id || (query.error instanceof ApiError && query.error.code === ApiErrorCode.NotFound);
    return (
      <SafeAreaView className="bg-background flex-1">
        <ScreenHeader title="Buyer requirement" />
        <View className="items-center gap-3 p-8">
          <Text className="text-center text-base font-semibold">
            {isMissing ? 'Requirement not found' : messageForError(query.error)}
          </Text>
          {isMissing ? (
            <Text variant="muted" className="text-center text-sm">
              It may have been closed, or it was not shared with your business.
            </Text>
          ) : (
            <Button onPress={() => query.refetch()}>
              <Text>Try again</Text>
            </Button>
          )}
        </View>
      </SafeAreaView>
    );
  }
  if (!query.data) {
    return (
      <SafeAreaView className="bg-background flex-1">
        <ScreenHeader title="Buyer requirement" />
        <ActivityIndicator className="mt-8" />
      </SafeAreaView>
    );
  }

  const requirement = query.data;
  const canQuote =
    !requirement.isMine && isVerified && requirement.status === 'open' && !requirement.hasQuoted;

  return (
    <SafeAreaView className="bg-background flex-1" edges={['top']}>
      <ScreenHeader title="Buyer requirement" />
      <ScrollView contentContainerClassName="gap-4 p-4">
        <RequirementCard
          requirement={requirement}
          onPress={() => undefined}
          actions={
            requirement.isMine ? (
              <RequirementOwnerActions requirement={requirement} showView={false} />
            ) : canQuote ? (
              <Button size="sm" onPress={() => setIsQuoting(true)}>
                <Text>Send quote</Text>
              </Button>
            ) : null
          }
        />
        {requirement.images.length > 0 ? (
          <View className="flex-row gap-2">
            {requirement.images.map((image) => (
              <Image
                key={image.id}
                source={{ uri: image.url }}
                style={{ width: 96, height: 96, borderRadius: 12 }}
                contentFit="cover"
                accessibilityLabel="Requirement image"
              />
            ))}
          </View>
        ) : null}
        {!requirement.isMine && !isVerified && requirement.status === 'open' ? (
          <Text className="bg-warning-soft text-warning rounded-xl p-3 text-sm">
            Only verified businesses can quote. Request the badge from the Business Hub.
          </Text>
        ) : null}
        {requirement.isMine ? (
          <QuotesReceived
            requirementId={requirement.id}
            onOpenChat={(quote) => router.push(`/messages/${quote.conversationId}`)}
          />
        ) : null}
      </ScrollView>
      <QuoteSheet
        requirement={isQuoting ? requirement : null}
        onClose={() => setIsQuoting(false)}
      />
    </SafeAreaView>
  );
}

function QuotesReceived({
  requirementId,
  onOpenChat,
}: {
  requirementId: string;
  onOpenChat: (quote: Quote) => void;
}) {
  const quotes = useRequirementQuotes(requirementId, true);
  const items = quotes.data?.pages.flatMap((page) => page.data) ?? [];
  return (
    <View className="gap-3">
      <Text className="text-base font-bold" role="heading">
        Quotes received
      </Text>
      {quotes.isPending ? <ActivityIndicator /> : null}
      {!quotes.isPending && items.length === 0 ? (
        <Text variant="muted" className="text-sm">
          No quotes yet. Matching suppliers have been told; their quotes arrive here and in your
          messages.
        </Text>
      ) : null}
      {items.map((quote) => (
        <View key={quote.id} className="bg-card border-border gap-1.5 rounded-2xl border p-4">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="text-sm font-bold">{quote.business.name}</Text>
            {quote.business.isVerified ? (
              <Badge variant="secondary">
                <Text>Verified</Text>
              </Badge>
            ) : null}
            <Text variant="muted" className="text-xs">
              {quote.business.city.name}
            </Text>
          </View>
          <Text className="text-primary text-lg font-black">{formatPrice(quote.price)}</Text>
          <Text variant="muted" className="text-sm">
            {quote.message}
          </Text>
          <Button
            size="sm"
            variant="outline"
            className="self-start"
            onPress={() => onOpenChat(quote)}
            accessibilityLabel={`Chat with ${quote.business.name}`}
          >
            <Icon as={MessageSquare} size={14} />
            <Text>Chat</Text>
          </Button>
        </View>
      ))}
      {quotes.hasNextPage ? (
        <Button variant="outline" onPress={() => quotes.fetchNextPage()}>
          <Text>More quotes</Text>
        </Button>
      ) : null}
    </View>
  );
}
