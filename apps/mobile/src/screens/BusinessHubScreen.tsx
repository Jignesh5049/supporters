import React, { useState } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Settings } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';
import {
  HubEmptyState,
  HubBannerHeader,
  HubMetricsAndCompletion,
  HubPageControls,
  HubStorefrontHighlights,
} from '../features/hub/components';
import { useMyPosts } from '../features/hub/hooks/use-my-posts';
import { hasNoBusiness, useMyBusiness } from '../features/business/hooks';
import { listingsUsage } from '../features/business/labels';
import { messageForError } from '../lib/api';
import { FollowersModal } from '../features/business/components/FollowersModal';

export function BusinessHubScreen() {
  const { navigate } = useApp();
  const publishedPosts = useMyPosts('published');
  const draftPosts = useMyPosts('draft');
  const myBusiness = useMyBusiness();
  const business = myBusiness.data;
  const [followersModalOpen, setFollowersModalOpen] = useState(false);

  if (myBusiness.isPending) {
    return (
      <View style={[styles.screenWrapper, styles.centered]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (myBusiness.isError && !hasNoBusiness(myBusiness.error)) {
    return (
      <View style={[styles.screenWrapper, styles.centered]}>
        <Text style={styles.errorText}>{messageForError(myBusiness.error)}</Text>
        <TouchableOpacity onPress={() => myBusiness.refetch()} style={styles.retryBtn}>
          <Text style={styles.retryBtnText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!business) {
    return (
      <View style={styles.screenWrapper}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigate('profile')}
            style={styles.backBtn}
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Business Hub</Text>
          <View style={styles.topBarSpacer} />
        </View>

        <HubEmptyState onCreateProfile={() => navigate('business_edit')} />
      </View>
    );
  }

  // Counts of the first page (20) of each list; the Posts screen has the full lists.
  const publishedPostsCount = publishedPosts.data?.pages[0]?.data.length ?? 0;
  const draftPostsCount = draftPosts.data?.pages[0]?.data.length ?? 0;
  const usage = listingsUsage(business.publishedListings, business.publishedListingsLimit);

  return (
    <View style={styles.screenWrapper}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigate('profile')}
          style={styles.backBtn}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Business Hub (Manager)</Text>
        <TouchableOpacity
          onPress={() => navigate('business_settings')}
          style={styles.settingsBtn}
          activeOpacity={0.8}
          accessibilityLabel="Business settings"
        >
          <Settings size={18} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <HubBannerHeader
          business={business}
          onViewPublicProfile={() => navigate('business_detail', { slug: business.slug })}
          onEditProfile={() => navigate('business_edit')}
        />

        <HubMetricsAndCompletion
          completionPercent={business.profileCompletion}
          followersCount={business.followerCount}
          postsCount={publishedPostsCount + draftPostsCount}
          publishedPostsCount={publishedPostsCount}
          listingsLabel={usage.label}
          isAtListingLimit={usage.atLimit}
          onOpenFollowers={() => setFollowersModalOpen(true)}
          onNavigatePosts={() => navigate('business_posts')}
          onCompleteProfile={() => navigate('business_edit')}
        />

        <HubPageControls
          draftPostsCount={draftPostsCount}
          onOpenProducts={() => router.push('/hub/products')}
          onOpenServices={() => router.push('/hub/services')}
          onNavigate={(route: string) => navigate(route as any)}
        />

        <HubStorefrontHighlights business={business} />
      </ScrollView>

      <FollowersModal
        visible={followersModalOpen}
        onClose={() => setFollowersModalOpen(false)}
        businessId={business.id}
        businessName={business.name}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 6,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  settingsBtn: {
    padding: 6,
  },
  topBarSpacer: {
    width: 32,
  },
  container: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
