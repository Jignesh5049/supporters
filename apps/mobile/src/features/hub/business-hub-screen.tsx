import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { colors } from '../../styles/theme';

export function BusinessHubScreen() {
  const { userBusiness, posts, products, businesses, openConversationWithBusiness, navigate } =
    useApp();
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followersSearch, setFollowersSearch] = useState('');

  if (!userBusiness) {
    return (
      <View style={styles.screenWrapper}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigate('profile')} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Business Hub</Text>
          <View style={{ width: 32 }} />
        </View>

        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyIconCircle}>
            <MaterialCommunityIcons name="store-outline" size={38} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No Business Profile Found</Text>
          <Text style={styles.emptyDesc}>
            Create your digital B2B storefront to showcase products, connect with wholesale buyers,
            and publish company dispatches.
          </Text>
          <TouchableOpacity
            style={styles.createBizBtn}
            onPress={() => navigate('business_edit')}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={16} color="#FFFFFF" />
            <Text style={styles.createBizBtnText}>Create Your Business Profile</Text>
          </TouchableOpacity>
        </View>
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
        <TouchableOpacity onPress={() => navigate('profile')} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Business Hub (Manager)</Text>
        <TouchableOpacity
          onPress={() => navigate('business_settings')}
          style={styles.settingsBtn}
          activeOpacity={0.8}
        >
          <Feather name="settings" size={16} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Cover & Brand Info Header */}
        <View style={styles.bannerCard}>
          <Image
            source={{ uri: userBusiness.coverImage }}
            style={styles.coverImage}
            resizeMode="cover"
          />

          <View style={styles.profileHeaderContent}>
            <View style={styles.avatarRow}>
              <View style={styles.avatarWrapper}>
                <Image source={{ uri: userBusiness.avatar }} style={styles.avatar} />
                {userBusiness.verified && (
                  <View style={styles.verifiedDot}>
                    <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                  </View>
                )}
              </View>

              {/* Owner Action Buttons */}
              <View style={styles.headerActionsCol}>
                <TouchableOpacity
                  style={styles.publicProfileBtn}
                  onPress={() => navigate('business_detail', { businessId: userBusiness.id })}
                  activeOpacity={0.8}
                >
                  <Feather name="eye" size={13} color="#FFFFFF" />
                  <Text style={styles.publicProfileBtnText}>View Public Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.editProfileBtn}
                  onPress={() => navigate('business_edit')}
                  activeOpacity={0.8}
                >
                  <Feather name="edit-2" size={12} color={colors.primary} />
                  <Text style={styles.editProfileBtnText}>Edit Profile</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Business Titles */}
            <View style={styles.businessTitleRow}>
              <Text style={styles.businessName}>{userBusiness.name}</Text>
              {userBusiness.verified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedBadgeText}>Verified Gold</Text>
                </View>
              )}
            </View>
            <Text style={styles.businessCategory}>
              {userBusiness.category} · {userBusiness.businessType} · {userBusiness.city}
            </Text>

            <Text style={styles.aboutSnippet} numberOfLines={2}>
              {userBusiness.about}
            </Text>
          </View>
        </View>

        {/* Profile Completion Card */}
        <View style={styles.completionCard}>
          <View style={styles.completionTop}>
            <View>
              <Text style={styles.completionTitle}>Profile Completion: {completionPercent}%</Text>
              <Text style={styles.completionSub}>
                Add Instagram link & operating hours to rank higher in search
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigate('business_edit')}>
              <Text style={styles.completeLink}>Complete ↗</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.completionTrack}>
            <View style={[styles.completionBar, { width: `${completionPercent}%` }]} />
          </View>
        </View>

        {/* Metric Cards Row */}
        <View style={styles.metricsRow}>
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => setFollowersModalOpen(true)}
            activeOpacity={0.75}
          >
            <Text style={[styles.metricNumber, { color: colors.primary }]}>
              {userBusiness.followersCount}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.primary, fontWeight: '700' }]}>
              Followers ↗
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.metricCard} onPress={() => navigate('business_posts')}>
            <Text style={[styles.metricNumber, { color: colors.primary }]}>
              {businessPosts.length}
            </Text>
            <Text style={styles.metricLabel}>Posts ({publishedPostsCount} Live)</Text>
          </TouchableOpacity>

          <View style={styles.metricCard}>
            <Text style={[styles.metricNumber, { color: '#00AEEF' }]}>
              {businessProducts.length}
            </Text>
            <Text style={styles.metricLabel}>Catalog Items</Text>
          </View>
        </View>

        {/* Core Management Hub Modules */}
        <Text style={styles.sectionHeader}>Business Page Controls</Text>

        <View style={styles.hubGrid}>
          {/* Module 1: Manage Posts */}
          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => navigate('business_posts')}
            activeOpacity={0.8}
          >
            <View style={[styles.hubIconCircle, { backgroundColor: '#EEF2FF' }]}>
              <MaterialCommunityIcons
                name="newspaper-variant-outline"
                size={22}
                color={colors.primary}
              />
            </View>
            <View style={styles.hubCardText}>
              <View style={styles.hubTitleRow}>
                <Text style={styles.hubCardTitle}>Manage Posts</Text>
                {draftPostsCount > 0 && (
                  <View style={styles.draftBadge}>
                    <Text style={styles.draftBadgeText}>{draftPostsCount} Draft</Text>
                  </View>
                )}
              </View>
              <Text style={styles.hubCardDesc}>
                Publish updates, manage drafts, archive or delete factory posts
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color="#94A3B8" />
          </TouchableOpacity>

          {/* Module 2: Edit Business Profile */}
          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => navigate('business_edit')}
            activeOpacity={0.8}
          >
            <View style={[styles.hubIconCircle, { backgroundColor: '#F0FDF4' }]}>
              <Feather name="file-text" size={20} color="#16A34A" />
            </View>
            <View style={styles.hubCardText}>
              <Text style={styles.hubCardTitle}>Edit Business Information</Text>
              <Text style={styles.hubCardDesc}>
                Address, Google Maps link, Instagram handle, opening hours
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color="#94A3B8" />
          </TouchableOpacity>

          {/* Module 3: Create New Post */}
          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => navigate('create')}
            activeOpacity={0.8}
          >
            <View style={[styles.hubIconCircle, { backgroundColor: '#FDF4FF' }]}>
              <Feather name="plus-circle" size={20} color={colors.accentMagenta} />
            </View>
            <View style={styles.hubCardText}>
              <Text style={styles.hubCardTitle}>Create New Listing / Post</Text>
              <Text style={styles.hubCardDesc}>
                Broadcast catalog items, offers or milestones with 16:9 & 9:16 media
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color="#94A3B8" />
          </TouchableOpacity>

          {/* Module 4: Settings */}
          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => navigate('business_settings')}
            activeOpacity={0.8}
          >
            <View style={[styles.hubIconCircle, { backgroundColor: '#F8FAFC' }]}>
              <Feather name="sliders" size={20} color="#475569" />
            </View>
            <View style={styles.hubCardText}>
              <Text style={styles.hubCardTitle}>Business Hub Settings</Text>
              <Text style={styles.hubCardDesc}>
                Notification preferences, address visibility & deactivation
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Business Highlights Quick Check */}
        <View style={styles.highlightsCard}>
          <Text style={styles.highlightsTitle}>Storefront Key Information</Text>
          <View style={styles.infoRow}>
            <Feather name="map-pin" size={13} color="#64748B" />
            <Text style={styles.infoText} numberOfLines={1}>
              {userBusiness.fullAddress || `${userBusiness.city}, ${userBusiness.state}`}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Feather name="instagram" size={13} color="#A3238E" />
            <Text style={[styles.infoText, { color: '#A3238E' }]}>
              {userBusiness.instagram || '@shree_electronics_official'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Feather name="clock" size={13} color="#64748B" />
            <Text style={styles.infoText}>
              {userBusiness.openingHours || 'Mon - Sat: 9:30 AM - 7:30 PM'}
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Instagram-style Followers Modal */}
      <Modal
        visible={followersModalOpen}
        animationType="slide"
        onRequestClose={() => setFollowersModalOpen(false)}
      >
        <View style={styles.followersModalContainer}>
          <View style={styles.followersModalHeader}>
            <TouchableOpacity
              onPress={() => setFollowersModalOpen(false)}
              style={styles.backModalBtn}
            >
              <Feather name="arrow-left" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.followersModalTitle}>Followers</Text>
              <Text style={styles.followersModalSub}>
                {userBusiness.name} · {userBusiness.followersCount} Followers
              </Text>
            </View>
            <View style={{ width: 28 }} />
          </View>

          {/* Search bar */}
          <View style={styles.followersSearchWrap}>
            <Feather name="search" size={14} color="#667085" />
            <TextInput
              style={styles.followersSearchInput}
              value={followersSearch}
              onChangeText={setFollowersSearch}
              placeholder="Search followers..."
              placeholderTextColor="#94A3B8"
            />
            {followersSearch.length > 0 && (
              <TouchableOpacity onPress={() => setFollowersSearch('')}>
                <Feather name="x" size={14} color="#667085" />
              </TouchableOpacity>
            )}
          </View>

          {/* List of Followers */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ flex: 1, paddingHorizontal: 16 }}
          >
            {businesses
              .filter((b) => b.id !== userBusiness.id)
              .filter((b) => {
                if (!followersSearch.trim()) return true;
                const q = followersSearch.toLowerCase();
                return (
                  b.name.toLowerCase().includes(q) ||
                  b.category.toLowerCase().includes(q) ||
                  b.city.toLowerCase().includes(q)
                );
              })
              .map((biz) => {
                return (
                  <View key={biz.id} style={styles.followerItemRow}>
                    <TouchableOpacity
                      style={styles.followerItemLeft}
                      onPress={() => {
                        setFollowersModalOpen(false);
                        navigate('business_detail', { businessId: biz.id });
                      }}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: biz.avatar }} style={styles.followerAvatar} />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={styles.followerName} numberOfLines={1}>
                            {biz.name}
                          </Text>
                          {biz.verified && (
                            <Ionicons name="checkmark-circle" size={12} color={colors.accentCyan} />
                          )}
                        </View>
                        <Text style={styles.followerCategory} numberOfLines={1}>
                          {biz.category} · {biz.city}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.messageFollowerBtn}
                      onPress={() => {
                        setFollowersModalOpen(false);
                        openConversationWithBusiness(biz.id);
                      }}
                      activeOpacity={0.8}
                    >
                      <Feather name="message-circle" size={12} color={colors.primary} />
                      <Text style={styles.messageFollowerBtnText}>Message</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
          </ScrollView>
        </View>
      </Modal>
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 4,
  },
  topBarTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  settingsBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  container: {
    flex: 1,
    padding: 14,
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  emptyDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    marginBottom: 20,
  },
  createBizBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createBizBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  bannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  coverImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#0F172A',
  },
  profileHeaderContent: {
    padding: 14,
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: -42,
    marginBottom: 10,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#E2E8F0',
  },
  verifiedDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accentCyan,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  headerActionsCol: {
    flexDirection: 'row',
    gap: 8,
  },
  publicProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  publicProfileBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  editProfileBtnText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  businessTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  businessName: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  verifiedBadge: {
    backgroundColor: '#E0F7FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedBadgeText: {
    color: '#0284C7',
    fontSize: 9.5,
    fontWeight: '800',
  },
  businessCategory: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  aboutSnippet: {
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 16,
    marginTop: 6,
  },
  completionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 14,
  },
  completionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  completionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  completionSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  completeLink: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  completionTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  completionBar: {
    height: '100%',
    backgroundColor: '#16A34A',
    borderRadius: 3,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    alignItems: 'center',
  },
  metricNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  hubGrid: {
    gap: 10,
    marginBottom: 18,
  },
  hubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  hubIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  hubCardText: {
    flex: 1,
  },
  hubTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hubCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  draftBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  draftBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D97706',
  },
  hubCardDesc: {
    fontSize: 10.5,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 14,
  },
  highlightsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8,
  },
  highlightsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    color: '#334155',
  },
  followersModalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
  },
  followersModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backModalBtn: {
    padding: 6,
  },
  followersModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  followersModalSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  followersSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginVertical: 12,
    gap: 8,
  },
  followersSearchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    padding: 0,
  },
  followerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    gap: 12,
  },
  followerItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  followerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
  },
  followerName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  followerCategory: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  messageFollowerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
  },
  messageFollowerBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primary,
  },
});
