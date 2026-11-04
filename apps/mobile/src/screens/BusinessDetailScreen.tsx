import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { slugPattern, type BusinessSummary } from '@supporters/shared';
import { Button } from '@supporters/ui-native/components/button';
import { Icon } from '@supporters/ui-native/components/icon';
import { Text } from '@supporters/ui-native/components/text';
import { useApp } from '../context/AppContext';
import { ApiError, ApiErrorCode, messageForError } from '../lib/api';
import { useBusiness, useMyBusiness } from '../features/business/hooks';
import { BusinessHero } from '../features/business/components/BusinessHero';
import {
  BusinessNavTabs,
  type BusinessTabType,
} from '../features/business/components/BusinessNavTabs';
import {
  BusinessAboutTab,
  BusinessPostsTab,
  BusinessProductsTab,
  BusinessServicesTab,
} from '../features/business/components/BusinessTabs';
import { FollowersModal } from '../features/business/components/FollowersModal';
import { followedIds, useFollowing, useToggleFollow } from '../features/social/hooks/use-follow';
import { useRequireAuth } from '../features/social/use-require-auth';

function TopBar({ title }: { title: string }) {
  return (
    <View className="border-border bg-background h-13 flex-row items-center gap-2 border-b px-2">
      <Button
        variant="ghost"
        size="icon"
        onPress={() => router.back()}
        accessibilityLabel="Go back"
      >
        <Icon as={ArrowLeft} size={20} />
      </Button>
      <Text className="flex-1 text-base font-bold" numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

export function BusinessDetailScreen() {
  const { slug: rawSlug } = useLocalSearchParams<{ slug: string }>();
  const slug = typeof rawSlug === 'string' && slugPattern.test(rawSlug) ? rawSlug : '';
  const { openShareModal, openEnquiryModal, showToast } = useApp();
  const requireAuth = useRequireAuth();
  const [activeTab, setActiveTab] = useState<BusinessTabType>('products');
  const [followersOpen, setFollowersOpen] = useState(false);

  const business = useBusiness(slug);
  const myBusiness = useMyBusiness();
  const following = useFollowing();
  const toggleFollow = useToggleFollow();

  if (business.isPending && slug) {
    return (
      <SafeAreaView className="bg-background flex-1">
        <TopBar title="Business" />
        <ActivityIndicator className="mt-8" />
      </SafeAreaView>
    );
  }

  if (!business.data) {
    const isMissing =
      !slug ||
      (business.error instanceof ApiError && business.error.code === ApiErrorCode.NotFound);
    return (
      <SafeAreaView className="bg-background flex-1">
        <TopBar title="Business" />
        <View className="items-center gap-3 p-8">
          <Text className="text-center text-base font-semibold">
            {isMissing ? 'Business not found' : messageForError(business.error)}
          </Text>
          {!isMissing ? (
            <Button onPress={() => business.refetch()}>
              <Text>Try again</Text>
            </Button>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  const data = business.data;
  const isOwner = myBusiness.data?.id === data.id;
  const isFollowing = followedIds(following.data).has(data.id);
  const shareUrl = `https://supporters.in/business/${encodeURIComponent(data.slug)}`;
  const summary: BusinessSummary = {
    id: data.id,
    slug: data.slug,
    name: data.name,
    logo: data.logo,
    city: data.city,
    isVerified: data.isVerified,
    isPremium: data.isPremium,
  };

  const handleToggleFollow = () =>
    requireAuth(() =>
      toggleFollow.mutate(
        { businessId: data.id, isFollowing: !isFollowing, summary },
        { onError: (error) => showToast(messageForError(error), 'error') },
      ),
    );

  return (
    <SafeAreaView className="bg-background flex-1">
      <TopBar title={data.name} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {isOwner ? (
          <Button
            variant="secondary"
            className="mx-4 mt-3"
            onPress={() => router.push('/hub')}
            accessibilityLabel="Open Business Hub"
          >
            <Text>You are viewing your public page. Open Business Hub</Text>
          </Button>
        ) : null}
        <BusinessHero
          business={data}
          isFollowing={isFollowing}
          isFollowBusy={toggleFollow.isPending}
          canFollow={!isOwner}
          onToggleFollow={handleToggleFollow}
          onOpenFollowers={() => setFollowersOpen(true)}
          onShare={() => openShareModal({ title: `${data.name} on Supporters`, url: shareUrl })}
          onEnquiry={() =>
            requireAuth(() =>
              openEnquiryModal({ title: data.name, businessName: data.name, businessId: data.id }),
            )
          }
        />
        <BusinessNavTabs activeTab={activeTab} onTabChange={setActiveTab} />
        {activeTab === 'products' ? (
          <BusinessProductsTab businessId={data.id} onOpen={(path) => router.push(path as never)} />
        ) : null}
        {activeTab === 'services' ? (
          <BusinessServicesTab businessId={data.id} onOpen={(path) => router.push(path as never)} />
        ) : null}
        {activeTab === 'posts' ? <BusinessPostsTab businessId={data.id} /> : null}
        {activeTab === 'about' ? <BusinessAboutTab business={data} /> : null}
      </ScrollView>

      <FollowersModal
        visible={followersOpen}
        onClose={() => setFollowersOpen(false)}
        businessId={data.id}
        businessName={data.name}
      />
    </SafeAreaView>
  );
}
