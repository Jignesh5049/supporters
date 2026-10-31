import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { ArrowLeft, Share2, Settings, ChevronRight } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { colors, spacing } from '../styles/theme';
import { BusinessHero } from '../features/business/components/BusinessHero';
import { BusinessNavTabs, BusinessTabType } from '../features/business/components/BusinessNavTabs';
import { BusinessProductsTab } from '../features/business/components/BusinessProductsTab';
import { BusinessServicesTab } from '../features/business/components/BusinessServicesTab';
import { BusinessPostsTab } from '../features/business/components/BusinessPostsTab';
import { BusinessAboutTab } from '../features/business/components/BusinessAboutTab';
import { FollowersModal } from '../features/business/components/FollowersModal';

export function BusinessDetailScreen() {
  const {
    businesses,
    products,
    services,
    posts,
    savedProductIds,
    toggleSaveProduct,
    followedBusinessIds,
    toggleFollowBusiness,
    openEnquiryModal,
    openShareModal,
    openConversationWithBusiness,
    routeParams,
    navigate,
    currentUser,
  } = useApp();

  const [activeTab, setActiveTab] = useState<BusinessTabType>('products');
  const [followersModalOpen, setFollowersModalOpen] = useState(false);

  const businessId = routeParams?.businessId || 'b-1';
  const business = businesses.find((b) => b.id === businessId) || businesses[0];

  const isOwner = currentUser?.businessId === business?.id;

  const businessProducts = products.filter((p) => p.businessId === business?.id);
  const businessServices = services.filter((s) => s.businessId === business?.id);
  const businessPosts = posts.filter(
    (p) => p.businessId === business?.id && p.postStatus !== 'Draft' && p.postStatus !== 'Archived',
  );

  const isFollowing = business ? followedBusinessIds.includes(business.id) : false;

  if (!business) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigate('home')} style={styles.backBtn}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Business Not Found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigate('home')}
          style={styles.backBtn}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {business.name}
        </Text>
        <TouchableOpacity
          onPress={() =>
            openShareModal({
              title: `${business.name} on Supporters`,
              url: `https://supporters.in/business/${business.slug}`,
            })
          }
          style={styles.shareBtn}
          accessibilityLabel="Share profile"
        >
          <Share2 size={18} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Owner Quick Access Banner */}
      {isOwner && (
        <TouchableOpacity
          style={styles.ownerBanner}
          onPress={() => navigate('business_hub')}
          activeOpacity={0.85}
        >
          <View style={styles.ownerBannerLeft}>
            <Settings size={16} color="#0D9488" />
            <View>
              <Text style={styles.ownerBannerTitle}>You are viewing your public storefront</Text>
              <Text style={styles.ownerBannerSub}>Switch to Business Hub Manager to edit</Text>
            </View>
          </View>
          <ChevronRight size={18} color="#0D9488" />
        </TouchableOpacity>
      )}

      {/* Scrollable Profile Body */}
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        <BusinessHero
          business={business}
          isFollowing={isFollowing}
          onToggleFollow={() => toggleFollowBusiness(business.id)}
          onOpenFollowers={() => setFollowersModalOpen(true)}
          onOpenChat={() => openConversationWithBusiness(business.id)}
          onOpenShare={() =>
            openShareModal({
              title: `${business.name} on Supporters`,
              url: `https://supporters.in/business/${business.slug}`,
            })
          }
        />

        <BusinessNavTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          productsCount={businessProducts.length}
          servicesCount={businessServices.length}
          postsCount={businessPosts.length}
        />

        {activeTab === 'products' && (
          <BusinessProductsTab
            products={businessProducts}
            savedProductIds={savedProductIds}
            onToggleSave={toggleSaveProduct}
            onOpenProduct={(id) => navigate('product_detail', { productId: id })}
            onOpenEnquiry={(product) => openEnquiryModal(product)}
          />
        )}

        {activeTab === 'services' && (
          <BusinessServicesTab
            services={businessServices}
            savedServiceIds={savedProductIds}
            onToggleSave={toggleSaveProduct}
            onOpenService={(id) => navigate('service_detail', { serviceId: id })}
            onOpenEnquiry={(service) => openEnquiryModal(service)}
          />
        )}

        {activeTab === 'posts' && <BusinessPostsTab posts={businessPosts} />}

        {activeTab === 'about' && <BusinessAboutTab business={business} />}
      </ScrollView>

      {/* Followers Modal */}
      <FollowersModal
        visible={followersModalOpen}
        onClose={() => setFollowersModalOpen(false)}
        businessName={business.name}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginHorizontal: spacing.sm,
  },
  shareBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerBanner: {
    backgroundColor: '#F0FDFA',
    borderBottomWidth: 1,
    borderBottomColor: '#CCFBF1',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ownerBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  ownerBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
  },
  ownerBannerSub: {
    fontSize: 11,
    color: '#115E59',
    marginTop: 1,
  },
  scrollView: {
    flex: 1,
  },
});
