import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { FeedPostCard } from '../components/FeedPostCard';
import { colors } from '../styles/theme';

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
    routeParams,
    navigate
  } = useApp();

  const [activeTab, setActiveTab] = useState<'products' | 'services' | 'posts' | 'about'>('products');

  const businessId = routeParams?.businessId || 'b-1';
  const business = businesses.find((b) => b.id === businessId) || businesses[0];

  const businessProducts = products.filter((p) => p.businessId === business.id);
  const businessServices = services.filter((s) => s.businessId === business.id);
  const businessPosts = posts.filter((p) => p.businessId === business.id);

  const isFollowing = followedBusinessIds.includes(business.id);

  const handleCall = () => {
    Linking.openURL(`tel:${business.phone}`);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
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
                name={savedBusinessIds.includes(business.id) ? "bookmark" : "bookmark-outline"}
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

            {/* Follow Business Button */}
            <TouchableOpacity
              onPress={() => toggleFollowBusiness(business.id)}
              style={[styles.followBtn, isFollowing && styles.followBtnActive]}
              activeOpacity={0.75}
            >
              {isFollowing ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="checkmark-circle" size={13} color="#065F46" />
                  <Text style={styles.followBtnTextActive}>Following</Text>
                </View>
              ) : (
                <Text style={styles.followBtnText}>+ Follow</Text>
              )}
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
          <Text style={styles.followersText}>
            {business.followersCount.toLocaleString()} supporters
          </Text>
        </View>

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

          <TouchableOpacity style={styles.secondaryCta} onPress={handleCall}>
            <Feather name="phone" size={13} color={colors.primary} />
            <Text style={styles.secondaryCtaText}>Call Business</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs Bar */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            onPress={() => setActiveTab('products')}
            style={[styles.tabItem, activeTab === 'products' && styles.tabItemActive]}
          >
            <Text style={[styles.tabItemText, activeTab === 'products' && styles.tabItemTextActive]}>
              Products ({businessProducts.length})
            </Text>
          </TouchableOpacity>

          {businessServices.length > 0 && (
            <TouchableOpacity
              onPress={() => setActiveTab('services')}
              style={[styles.tabItem, activeTab === 'services' && styles.tabItemActive]}
            >
              <Text style={[styles.tabItemText, activeTab === 'services' && styles.tabItemTextActive]}>
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
                      <Text style={styles.productPrice}>
                        ₹{p.price.toLocaleString('en-IN')}
                      </Text>
                      <TouchableOpacity
                        onPress={() => toggleSaveProduct(p.id)}
                        style={[styles.prodSavePill, isSavedProd && styles.prodSavePillActive]}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons
                          name={isSavedProd ? "bookmark" : "bookmark-outline"}
                          size={12}
                          color={isSavedProd ? colors.primary : '#667085'}
                        />
                        <Text style={[styles.prodSaveText, isSavedProd && styles.prodSaveTextActive]}>
                          {isSavedProd ? 'Saved' : 'Save'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.productTitle} numberOfLines={2}>
                      {p.title}
                    </Text>
                    <Text style={styles.productMoq}>
                      MOQ: {p.minOrderQuantity} {p.unit}
                    </Text>
                    <TouchableOpacity
                      style={styles.quoteSmallBtn}
                      onPress={() =>
                        openEnquiryModal({
                          title: p.title,
                          businessName: business.name,
                          businessId: business.id,
                        })
                      }
                    >
                      <Text style={styles.quoteSmallText}>Get Quote</Text>
                    </TouchableOpacity>
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
            {businessPosts.map((post) => (
              <FeedPostCard key={post.id} post={post} />
            ))}
          </View>
        )}

        {activeTab === 'about' && (
          <View style={styles.aboutContainer}>
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
              <View style={styles.tableRow}>
                <Text style={styles.colLabel}>Full Address:</Text>
                <Text style={styles.colValue}>{business.fullAddress}</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
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
    height: 120,
    width: '100%',
    backgroundColor: '#E5E7EB',
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
    marginTop: -30,
    marginBottom: 8,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#E5E7EB',
  },
  verifiedDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accentCyan,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
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
});
