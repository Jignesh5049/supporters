import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
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
import { useMyBusiness } from '../features/business/hooks';
import { FollowersModal } from '../features/business/components/FollowersModal';

export function BusinessHubScreen() {
  const { userBusiness, posts, products, navigate } = useApp();
  const myBusiness = useMyBusiness();
  const [followersModalOpen, setFollowersModalOpen] = useState(false);

  if (!userBusiness) {
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

  const businessPosts = posts.filter((p) => p.businessId === userBusiness.id || p.isOwnPost);
  const publishedPostsCount = businessPosts.filter((p) => p.postStatus !== 'Draft').length;
  const draftPostsCount = businessPosts.filter((p) => p.postStatus === 'Draft').length;
  const businessProducts = products.filter((p) => p.businessId === userBusiness.id);
  const completionPercent = userBusiness.profileCompletion || 85;

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
          business={userBusiness}
          onViewPublicProfile={() => navigate('business_detail', { slug: myBusiness.data?.slug })}
          onEditProfile={() => navigate('business_edit')}
        />

        <HubMetricsAndCompletion
          completionPercent={completionPercent}
          followersCount={userBusiness.followersCount}
          postsCount={businessPosts.length}
          publishedPostsCount={publishedPostsCount}
          productsCount={businessProducts.length}
          onOpenFollowers={() => setFollowersModalOpen(true)}
          onNavigatePosts={() => navigate('business_posts')}
          onCompleteProfile={() => navigate('business_edit')}
        />

        <HubPageControls
          draftPostsCount={draftPostsCount}
          onNavigate={(route: string) => navigate(route as any)}
        />

        <HubStorefrontHighlights business={userBusiness} />
      </ScrollView>

      <FollowersModal
        visible={followersModalOpen}
        onClose={() => setFollowersModalOpen(false)}
        businessId={myBusiness.data?.id ?? ''}
        businessName={userBusiness.name}
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
});
