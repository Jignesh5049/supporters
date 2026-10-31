import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { parseRouteId } from '../../lib/navigation/params';
import { FeedPostCard } from '../../components/FeedPostCard';
import { colors } from '../../styles/theme';

export function BusinessDetailScreen() {
  const {
    businesses,
    products,
    services,
    posts,
    savedProductIds,
    toggleSaveProduct,
    savedBusinessIds,
    toggleSaveBusiness,
    followedBusinessIds,
    toggleFollowBusiness,
    openEnquiryModal,
    openShareModal,
    openConversationWithBusiness,
    navigate,
    currentUser,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'products' | 'services' | 'posts' | 'about'>(
    'products',
  );
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followersSearch, setFollowersSearch] = useState('');

  const { slug } = useLocalSearchParams<{ slug: string }>();
  const businessId = parseRouteId(slug) ?? 'b-1';
  const business = businesses.find((b) => b.id === businessId) || businesses[0];

  const isOwner = currentUser?.businessId === business.id;

  const businessProducts = products.filter((p) => p.businessId === business.id);
  const businessServices = services.filter((s) => s.businessId === business.id);
  // Requirement: Only published posts should appear on the public page
  const businessPosts = posts.filter(
    (p) => p.businessId === business.id && p.postStatus !== 'Draft' && p.postStatus !== 'Archived',
  );

  const isFollowing = followedBusinessIds.includes(business.id);

  const handleOpenInstagram = () => {
    if (!business.instagram) return;
    const handle = business.instagram.replace('@', '').trim();
    const url = business.instagram.startsWith('http')
      ? business.instagram
      : `https://instagram.com/${handle}`;
    Linking.openURL(url);
  };

  const handleOpenWebsite = () => {
    if (!business.website) return;
    const url = business.website.startsWith('http')
      ? business.website
      : `https://${business.website}`;
    Linking.openURL(url);
  };

  const handleGetDirections = () => {
    const query = encodeURIComponent(
      business.fullAddress ||
        `${business.addressLine || ''} ${business.city || ''} ${business.state || ''}`.trim() ||
        business.name,
    );
    const url = business.mapUrl || `https://www.google.com/maps/search/?api=1&query=${query}`;
    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {/* Top Navigation Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigate('home')} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={colors.textPrimary} />
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
          >
            <Feather name="share-2" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Owner Manager Switcher Banner */}
        {isOwner && (
          <TouchableOpacity
            style={styles.ownerBanner}
            onPress={() => navigate('business_hub')}
            activeOpacity={0.85}
          >
            <View style={styles.ownerBannerLeft}>
              <Ionicons name="settings-sharp" size={16} color="#0D9488" />
              <View>
                <Text style={styles.ownerBannerTitle}>You are viewing your public storefront</Text>
                <Text style={styles.ownerBannerSub}>
                  Switch to Business Hub Manager to edit profile & posts
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color="#0D9488" />
          </TouchableOpacity>
        )}

        {/* Cover */}
        <View style={styles.coverContainer}>
          <Image source={{ uri: business.coverImage }} style={styles.coverImage} />
        </View>

        {/* Header Info */}
        <View style={styles.headerInfo}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarWrapper}>
              <Image source={{ uri: business.avatar }} style={styles.avatar} />
              {business.verified && (
                <View style={styles.verifiedDot}>
                  <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                </View>
              )}
            </View>

            <View style={styles.actionPillsRow}>
              {/* Save Business Button */}
              <TouchableOpacity
                onPress={() => toggleSaveBusiness(business.id)}
                style={[
                  styles.saveBizBtn,
                  savedBusinessIds.includes(business.id) && styles.saveBizBtnActive,
                ]}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={savedBusinessIds.includes(business.id) ? 'bookmark' : 'bookmark-outline'}
                  size={14}
                  color={savedBusinessIds.includes(business.id) ? colors.primary : '#667085'}
                />
                <Text
                  style={[
                    styles.saveBizBtnText,
                    savedBusinessIds.includes(business.id) && styles.saveBizBtnTextActive,
                  ]}
                >
                  {savedBusinessIds.includes(business.id) ? 'Saved' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.businessTitleRow}>
            <Text style={styles.businessName}>{business.name}</Text>
            {business.verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedBadgeText}>✓ Verified</Text>
              </View>
            )}
          </View>

          <Text style={styles.categorySub}>
            {business.businessType} · {business.category} · {business.city}, {business.state}
          </Text>

          <View style={styles.ratingRow}>
            <Text style={styles.ratingText}>
              ⭐ {business.rating} ({business.reviewCount} verified reviews)
            </Text>
            <Text style={styles.dot}>·</Text>
            <TouchableOpacity onPress={() => setFollowersModalOpen(true)} activeOpacity={0.7}>
              <Text
                style={[
                  styles.followersText,
                  { color: colors.primary, textDecorationLine: 'underline', fontWeight: '700' },
                ]}
              >
                {business.followersCount.toLocaleString()} supporters
              </Text>
            </TouchableOpacity>
          </View>

          {/* Verified Business Contact Number Banner (Shown when enabled in settings) */}
          {business.showPhone && business.phone && (
            <TouchableOpacity
              style={styles.verifiedContactCard}
              onPress={() => Linking.openURL(`tel:${business.phone}`)}
              activeOpacity={0.85}
              accessibilityLabel={`Call ${business.name} at ${business.phone}`}
            >
              <View style={styles.verifiedContactLeft}>
                <View style={styles.contactPhoneIconCircle}>
                  <Ionicons name="call" size={13} color="#0D9488" />
                </View>
                <View style={styles.contactNumberCol}>
                  <View style={styles.contactBadgeRow}>
                    <Text style={styles.contactLabel}>Official Contact Number</Text>
                    <View style={styles.tradeActiveDot} />
                    <Text style={styles.tradeActiveText}>Available</Text>
                  </View>
                  <Text style={styles.contactPhoneText}>{business.phone}</Text>
                </View>
              </View>

              <View style={styles.callNowPill}>
                <Feather name="phone-call" size={12} color="#0D9488" />
                <Text style={styles.callNowPillText}>Call</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* CTA Bar */}
          <View style={styles.ctaRow}>
            <TouchableOpacity
              style={styles.primaryCta}
              onPress={() => openConversationWithBusiness(business.id)}
              activeOpacity={0.8}
            >
              <Feather name="message-square" size={13} color="#FFFFFF" />
              <Text style={styles.primaryCtaText}>Contact Supplier</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryCta, isFollowing && styles.followingCta]}
              onPress={() => toggleFollowBusiness(business.id)}
              activeOpacity={0.8}
            >
              {isFollowing ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="checkmark-circle" size={14} color="#065F46" />
                  <Text style={styles.followingCtaText}>Following</Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Feather name="user-plus" size={13} color={colors.primary} />
                  <Text style={styles.secondaryCtaText}>Follow</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Tabs Bar */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              onPress={() => setActiveTab('products')}
              style={[styles.tabItem, activeTab === 'products' && styles.tabItemActive]}
            >
              <Text
                style={[styles.tabItemText, activeTab === 'products' && styles.tabItemTextActive]}
              >
                Products ({businessProducts.length})
              </Text>
            </TouchableOpacity>

            {businessServices.length > 0 && (
              <TouchableOpacity
                onPress={() => setActiveTab('services')}
                style={[styles.tabItem, activeTab === 'services' && styles.tabItemActive]}
              >
                <Text
                  style={[styles.tabItemText, activeTab === 'services' && styles.tabItemTextActive]}
                >
                  Services ({businessServices.length})
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => setActiveTab('posts')}
              style={[styles.tabItem, activeTab === 'posts' && styles.tabItemActive]}
            >
              <Text style={[styles.tabItemText, activeTab === 'posts' && styles.tabItemTextActive]}>
                Updates ({businessPosts.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('about')}
              style={[styles.tabItem, activeTab === 'about' && styles.tabItemActive]}
            >
              <Text style={[styles.tabItemText, activeTab === 'about' && styles.tabItemTextActive]}>
                About
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Contents */}
        <View style={styles.contentArea}>
          {activeTab === 'products' && (
            <View style={styles.productsGrid}>
              {businessProducts.map((p) => {
                const isSavedProd = savedProductIds.includes(p.id);
                return (
                  <View key={p.id} style={styles.productCard}>
                    <Image source={{ uri: p.images[0] }} style={styles.productImg} />
                    <View style={styles.productDetails}>
                      <View style={styles.prodTopRow}>
                        <Text style={styles.productPrice}>₹{p.price.toLocaleString('en-IN')}</Text>
                        <TouchableOpacity
                          onPress={() => toggleSaveProduct(p.id)}
                          style={[styles.prodSavePill, isSavedProd && styles.prodSavePillActive]}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Ionicons
                            name={isSavedProd ? 'bookmark' : 'bookmark-outline'}
                            size={12}
                            color={isSavedProd ? colors.primary : '#667085'}
                          />
                          <Text
                            style={[styles.prodSaveText, isSavedProd && styles.prodSaveTextActive]}
                          >
                            {isSavedProd ? 'Saved' : 'Save'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        onPress={() => navigate('product_detail', { productId: p.id })}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.productTitle} numberOfLines={2}>
                          {p.title}
                        </Text>
                      </TouchableOpacity>
                      <Text style={styles.productMoq}>
                        MOQ: {p.minOrderQuantity} {p.unit}
                      </Text>
                      <View style={styles.productActionsRow}>
                        <TouchableOpacity
                          style={styles.viewProdBtn}
                          onPress={() => navigate('product_detail', { productId: p.id })}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.viewProdText}>View Product</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.quoteSmallBtn}
                          onPress={() =>
                            openConversationWithBusiness(business.id, {
                              initialMessage: `Namaste! I am interested in "${p.title}" (₹${p.price.toLocaleString('en-IN')}). Please share wholesale pricing and delivery schedule.`,
                              attachedProduct: p,
                            })
                          }
                          activeOpacity={0.85}
                        >
                          <Feather name="message-square" size={11} color="#FFFFFF" />
                          <Text style={styles.quoteSmallText}>Contact Supplier</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {activeTab === 'services' && (
            <View style={styles.servicesList}>
              {businessServices.map((s) => (
                <View key={s.id} style={styles.serviceCard}>
                  <Image source={{ uri: s.images[0] }} style={styles.serviceImg} />
                  <View style={styles.serviceBody}>
                    <Text style={styles.serviceTitle}>{s.title}</Text>
                    <Text style={styles.servicePrice}>
                      Starting from ₹{s.startingPrice.toLocaleString('en-IN')} {s.priceUnit}
                    </Text>
                    <Text style={styles.serviceAreaText}>Area: {s.serviceArea}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {activeTab === 'posts' && (
            <View>
              {businessPosts.length === 0 ? (
                <View style={styles.emptyPostsBox}>
                  <Feather name="file-text" size={36} color="#94A3B8" />
                  <Text style={styles.emptyPostsTitle}>No Updates Yet</Text>
                  <Text style={styles.emptyPostsSub}>
                    This business has not published any updates recently.
                  </Text>
                  {isOwner && (
                    <TouchableOpacity
                      style={styles.createPostBtn}
                      onPress={() => navigate('business_posts')}
                    >
                      <Feather name="plus-circle" size={15} color="#FFFFFF" />
                      <Text style={styles.createPostBtnText}>Create Post as Owner</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                businessPosts.map((post) => <FeedPostCard key={post.id} post={post} />)
              )}
            </View>
          )}

          {activeTab === 'about' && (
            <View style={styles.aboutContainer}>
              {/* Quick Action Badges: Instagram, Website, Directions */}
              <View style={styles.quickActionsRow}>
                {business.instagram && (
                  <TouchableOpacity
                    style={styles.socialActionBtn}
                    onPress={handleOpenInstagram}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="logo-instagram" size={15} color="#E1306C" />
                    <Text style={styles.socialActionText} numberOfLines={1}>
                      @{business.instagram.replace('@', '').split('/').pop()}
                    </Text>
                  </TouchableOpacity>
                )}

                {business.website && (
                  <TouchableOpacity
                    style={styles.socialActionBtn}
                    onPress={handleOpenWebsite}
                    activeOpacity={0.8}
                  >
                    <Feather name="globe" size={14} color={colors.primary} />
                    <Text style={styles.socialActionText} numberOfLines={1}>
                      Visit Website
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.socialActionBtn, styles.directionsBtn]}
                  onPress={handleGetDirections}
                  activeOpacity={0.8}
                >
                  <Feather name="navigation" size={14} color="#0D9488" />
                  <Text style={[styles.socialActionText, { color: '#0D9488', fontWeight: '700' }]}>
                    Get Directions
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.aboutTitle}>Company Overview</Text>
              <Text style={styles.aboutText}>{business.about}</Text>

              <View style={styles.specsTable}>
                <View style={styles.tableRow}>
                  <Text style={styles.colLabel}>Established:</Text>
                  <Text style={styles.colValue}>{business.establishedYear}</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.colLabel}>Response Rate:</Text>
                  <Text style={styles.colValue}>{business.responseRate}</Text>
                </View>
                {business.gstin && (
                  <View style={styles.tableRow}>
                    <Text style={styles.colLabel}>GSTIN:</Text>
                    <Text style={styles.colValue}>{business.gstin}</Text>
                  </View>
                )}
                {business.openingHours && (
                  <View style={styles.tableRow}>
                    <Text style={styles.colLabel}>Opening Hours:</Text>
                    <Text style={styles.colValue}>{business.openingHours}</Text>
                  </View>
                )}
                {business.availabilityStatus && (
                  <View style={styles.tableRow}>
                    <Text style={styles.colLabel}>Availability:</Text>
                    <Text style={[styles.colValue, { color: '#059669', fontWeight: '700' }]}>
                      ● {business.availabilityStatus}
                    </Text>
                  </View>
                )}
                {business.showPhone && business.phone && (
                  <View style={styles.tableRow}>
                    <Text style={styles.colLabel}>Direct Contact:</Text>
                    <TouchableOpacity
                      onPress={() => Linking.openURL(`tel:${business.phone}`)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="call" size={12} color={colors.primary} />
                      <Text style={[styles.colValue, { color: colors.primary, fontWeight: '700' }]}>
                        {business.phone}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                {business.priceRange && (
                  <View style={styles.tableRow}>
                    <Text style={styles.colLabel}>Price Range:</Text>
                    <Text style={styles.colValue}>{business.priceRange}</Text>
                  </View>
                )}
                <View style={styles.tableRow}>
                  <Text style={styles.colLabel}>Full Address:</Text>
                  <Text style={styles.colValue}>
                    {business.fullAddress ||
                      `${business.addressLine || ''}, ${business.area || ''}, ${business.city}, ${business.state} - ${business.pinCode || ''}`}
                  </Text>
                </View>
              </View>

              {/* Clickable Direction Card */}
              <TouchableOpacity
                style={styles.directionCard}
                onPress={handleGetDirections}
                activeOpacity={0.8}
              >
                <View style={styles.directionLeft}>
                  <View style={styles.directionPinCircle}>
                    <Feather name="map-pin" size={16} color="#0D9488" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.directionCardTitle}>Navigate with Maps</Text>
                    <Text style={styles.directionCardSub} numberOfLines={1}>
                      {business.city}, {business.state}
                    </Text>
                  </View>
                </View>
                <View style={styles.directionActionPill}>
                  <Text style={styles.directionActionText}>Directions ↗</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
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
              <Text style={styles.followersModalTitle}>Supporters & Followers</Text>
              <Text style={styles.followersModalSub}>
                {business.name} · {business.followersCount} Followers
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
              .filter((b) => b.id !== business.id)
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 4,
  },
  topBarTitle: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  shareBtn: {
    padding: 4,
  },
  coverContainer: {
    height: 200,
    width: '100%',
    backgroundColor: '#0F172A',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  headerInfo: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: -46,
    marginBottom: 8,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    backgroundColor: '#E5E7EB',
  },
  verifiedDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accentCyan,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  actionPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveBizBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    gap: 4,
  },
  saveBizBtnActive: {
    backgroundColor: colors.primaryLight,
    borderColor: '#C7D2FE',
  },
  saveBizBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#667085',
  },
  saveBizBtnTextActive: {
    color: colors.primary,
  },
  followBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
  },
  followBtnActive: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  followBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  followBtnTextActive: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  businessTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  verifiedBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
  },
  categorySub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  ratingText: {
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  dot: {
    color: colors.textSecondary,
  },
  followersText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  verifiedContactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 10,
    marginBottom: 4,
  },
  verifiedContactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  contactPhoneIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  contactNumberCol: {
    flex: 1,
    minWidth: 0,
  },
  contactBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  contactLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#0F766E',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tradeActiveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
  },
  tradeActiveText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#059669',
  },
  contactPhoneText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  callNowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 16,
    flexShrink: 0,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  callNowPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0D9488',
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 12,
  },
  primaryCta: {
    flex: 1,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  primaryCtaText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  secondaryCta: {
    flex: 1,
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  secondaryCtaText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  followingCta: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  followingCtaText: {
    color: '#065F46',
    fontSize: 12,
    fontWeight: '700',
  },
  tabsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabItemText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabItemTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  contentArea: {
    padding: 12,
    paddingBottom: 24,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  productCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  productImg: {
    width: '100%',
    height: 110,
    backgroundColor: '#E5E7EB',
  },
  productDetails: {
    padding: 8,
  },
  productTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  prodTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  prodSavePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  prodSavePillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: '#C7D2FE',
  },
  prodSaveText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#667085',
  },
  prodSaveTextActive: {
    color: colors.primary,
  },
  productPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  productMoq: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  quoteSmallBtn: {
    backgroundColor: colors.primaryLight,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 6,
  },
  quoteSmallText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  servicesList: {
    gap: 10,
  },
  serviceCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    gap: 10,
  },
  serviceImg: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  serviceBody: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  servicePrice: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 2,
  },
  serviceAreaText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  aboutContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  aboutTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  aboutText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  specsTable: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 8,
    gap: 6,
  },
  tableRow: {
    flexDirection: 'row',
  },
  colLabel: {
    width: 110,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  colValue: {
    flex: 1,
    fontSize: 11,
    color: colors.textSecondary,
  },
  ownerBanner: {
    backgroundColor: '#F0FDFA',
    borderBottomWidth: 1,
    borderBottomColor: '#CCFBF1',
    paddingHorizontal: 16,
    paddingVertical: 10,
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
    fontWeight: '800',
    color: '#0F766E',
  },
  ownerBannerSub: {
    fontSize: 10,
    color: '#115E59',
    marginTop: 1,
  },
  emptyPostsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPostsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 10,
  },
  emptyPostsSub: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  createPostBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createPostBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  quickActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  socialActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  directionsBtn: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
  socialActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  directionCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  directionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  directionPinCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  directionCardSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  directionActionPill: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  directionActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  productActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  viewProdBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 5,
    borderRadius: 6,
    alignItems: 'center',
  },
  viewProdText: {
    fontSize: 11,
    fontWeight: '700',
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
