import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { CITIES } from '../../mock';
import { colors } from '../styles/theme';

export function DiscoverScreen() {
  const {
    products,
    services,
    businesses,
    savedProductIds,
    toggleSaveProduct,
    savedServiceIds,
    toggleSaveService,
    savedBusinessIds,
    toggleSaveBusiness,
    followedBusinessIds,
    toggleFollowBusiness,
    openEnquiryModal,
    navigate
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [activeTab, setActiveTab] = useState<'all' | 'products' | 'services' | 'businesses'>('all');

  // Trade Categories from user design
  const tradeCategories = [
    {
      id: 'electronics',
      name: 'Electronics',
      bgColor: '#EEF0FA',
      iconColor: '#2E3192',
      iconFamily: 'MaterialCommunityIcons' as const,
      iconName: 'devices' as const,
    },
    {
      id: 'fashion',
      name: 'Fashion',
      bgColor: '#FCE7F3',
      iconColor: '#A3238E',
      iconFamily: 'Ionicons' as const,
      iconName: 'shirt-outline' as const,
    },
    {
      id: 'food',
      name: 'Food...',
      bgColor: '#E0F2FE',
      iconColor: '#0284C7',
      iconFamily: 'Ionicons' as const,
      iconName: 'nutrition-outline' as const,
    },
    {
      id: 'agri',
      name: 'Agri Trade',
      bgColor: '#F3E8FF',
      iconColor: '#4338CA',
      iconFamily: 'MaterialCommunityIcons' as const,
      iconName: 'tractor' as const,
    },
    {
      id: 'machinery',
      name: 'Machinery',
      bgColor: '#EDE9FE',
      iconColor: '#334155',
      iconFamily: 'MaterialCommunityIcons' as const,
      iconName: 'robot-industrial' as const,
    },
    {
      id: 'hardware',
      name: 'Hardware',
      bgColor: '#DBEAFE',
      iconColor: '#2E3192',
      iconFamily: 'MaterialCommunityIcons' as const,
      iconName: 'hammer-wrench' as const,
    },
    {
      id: 'beauty',
      name: 'Beauty/Care',
      bgColor: '#FCE7F3',
      iconColor: '#A3238E',
      iconFamily: 'Ionicons' as const,
      iconName: 'flower-outline' as const,
    },
    {
      id: 'services',
      name: 'Services',
      bgColor: '#E0F2FE',
      iconColor: '#0284C7',
      iconFamily: 'Ionicons' as const,
      iconName: 'briefcase-outline' as const,
    },
  ];

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = selectedCity === 'All Cities' || p.businessCity === selectedCity;
    return matchesSearch && matchesCity;
  });

  // Filter services
  const filteredServices = services.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = selectedCity === 'All Cities' || s.businessCity === selectedCity;
    return matchesSearch && matchesCity;
  });

  // Filter businesses
  const filteredBusinesses = businesses.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCity = selectedCity === 'All Cities' || b.city === selectedCity;
    return matchesSearch && matchesCity;
  });

  const renderHeader = () => (
    <View style={styles.headerArea}>
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Feather name="search" size={16} color="#667085" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search products, services or businesses..."
          placeholderTextColor="#667085"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Feather name="x-circle" size={16} color="#667085" />
          </TouchableOpacity>
        )}
      </View>

      {/* City filter scroller */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cityScroll}
      >
        {CITIES.map((city) => {
          const isSelected = selectedCity === city;
          return (
            <TouchableOpacity
              key={city}
              onPress={() => setSelectedCity(city)}
              style={[
                styles.cityChip,
                isSelected ? styles.cityChipActive : styles.cityChipInactive,
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.cityChipText,
                  isSelected ? styles.cityChipTextActive : styles.cityChipTextInactive,
                ]}
              >
                {city}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Entity Tabs */}
      <View style={styles.tabsRow}>
        {(['all', 'products', 'services', 'businesses'] as const).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Trade Categories Banner (from user image) */}
      <View style={styles.tradeCategoriesCard}>
        <View style={styles.tradeHeaderRow}>
          <View style={styles.tradeTitleLeft}>
            <View style={styles.verticalBarAccent} />
            <Text style={styles.tradeCategoriesTitle}>Trade Categories</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              setSelectedCity('All Cities');
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.exploreAllLink}>Explore 140+ &gt;</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tradeCategoriesGrid}>
          {tradeCategories.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.tradeCategoryTile}
              onPress={() => {
                const term = item.name.replace('...', '');
                setSearchQuery(term);
              }}
              activeOpacity={0.75}
            >
              <View style={[styles.tradeIconSquircle, { backgroundColor: item.bgColor }]}>
                {item.iconFamily === 'MaterialCommunityIcons' ? (
                  <MaterialCommunityIcons
                    name={item.iconName as any}
                    size={22}
                    color={item.iconColor}
                  />
                ) : (
                  <Ionicons
                    name={item.iconName as any}
                    size={20}
                    color={item.iconColor}
                  />
                )}
              </View>
              <Text style={styles.tradeCategoryLabel} numberOfLines={1}>
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {renderHeader()}

      {/* Products Section */}
      {(activeTab === 'all' || activeTab === 'products') && (
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              Featured Products ({filteredProducts.length})
            </Text>
          </View>

          {filteredProducts.map((p) => {
            const isSaved = savedProductIds.includes(p.id);
            return (
              <View key={p.id} style={styles.listingCard}>
                <Image source={{ uri: p.images[0] }} style={styles.listingImage} />
                <View style={styles.listingDetails}>
                  <View style={styles.listingTopRow}>
                    <Text style={styles.categoryBadge}>{p.category}</Text>
                    <TouchableOpacity
                      onPress={() => toggleSaveProduct(p.id)}
                      style={[styles.savePillBtn, isSaved && styles.savePillBtnActive]}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isSaved ? "bookmark" : "bookmark-outline"}
                        size={14}
                        color={isSaved ? colors.primary : '#667085'}
                      />
                      <Text style={[styles.savePillText, isSaved && styles.savePillTextActive]}>
                        {isSaved ? 'Saved' : 'Save'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.listingTitle} numberOfLines={2}>
                    {p.title}
                  </Text>
                  <Text style={styles.businessSubtitle}>
                    {p.businessName} · {p.businessCity}
                  </Text>

                  <View style={styles.pricingRow}>
                    <Text style={styles.priceHighlight}>
                      ₹{p.price.toLocaleString('en-IN')}
                    </Text>
                    <Text style={styles.moqBadge}>
                      MOQ: {p.minOrderQuantity} {p.unit}
                    </Text>
                  </View>

                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.enquireButton}
                      onPress={() =>
                        openEnquiryModal({
                          title: p.title,
                          businessName: p.businessName,
                          businessId: p.businessId,
                        })
                      }
                      activeOpacity={0.85}
                    >
                      <Feather name="send" size={12} color="#FFFFFF" />
                      <Text style={styles.enquireButtonText}>Get Quote</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.detailsButton}
                      onPress={() =>
                        navigate('business_detail', { businessId: p.businessId })
                      }
                    >
                      <Text style={styles.detailsButtonText}>Supplier</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Services Section */}
      {(activeTab === 'all' || activeTab === 'services') && (
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              Verified Services ({filteredServices.length})
            </Text>
          </View>

          {filteredServices.map((s) => {
            const isSaved = savedServiceIds.includes(s.id);
            return (
              <View key={s.id} style={styles.listingCard}>
                <Image source={{ uri: s.images[0] }} style={styles.listingImage} />
                <View style={styles.listingDetails}>
                  <View style={styles.listingTopRow}>
                    <Text style={[styles.categoryBadge, { backgroundColor: '#E0F7FE', color: '#0284C7' }]}>
                      {s.category}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.slaBadge}>{s.availability}</Text>
                      <TouchableOpacity
                        onPress={() => toggleSaveService(s.id)}
                        style={[styles.savePillBtn, isSaved && styles.savePillBtnActive]}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={isSaved ? "bookmark" : "bookmark-outline"}
                          size={14}
                          color={isSaved ? colors.primary : '#667085'}
                        />
                        <Text style={[styles.savePillText, isSaved && styles.savePillTextActive]}>
                          {isSaved ? 'Saved' : 'Save'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={styles.listingTitle} numberOfLines={2}>
                    {s.title}
                  </Text>
                  <Text style={styles.businessSubtitle}>
                    {s.businessName} · {s.businessCity}
                  </Text>

                  <View style={styles.pricingRow}>
                    <Text style={styles.priceHighlight}>
                      From ₹{s.startingPrice.toLocaleString('en-IN')}
                    </Text>
                    <Text style={styles.moqBadge}>{s.priceUnit}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.enquireButton}
                    onPress={() =>
                      openEnquiryModal({
                        title: s.title,
                        businessName: s.businessName,
                        businessId: s.businessId,
                      })
                    }
                    activeOpacity={0.85}
                  >
                    <Feather name="send" size={12} color="#FFFFFF" />
                    <Text style={styles.enquireButtonText}>Request Consultation</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Businesses Section */}
      {(activeTab === 'all' || activeTab === 'businesses') && (
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              Verified Manufacturers & Suppliers ({filteredBusinesses.length})
            </Text>
          </View>

          {filteredBusinesses.map((b) => {
            const isFollowing = followedBusinessIds.includes(b.id);
            const isSavedBiz = savedBusinessIds.includes(b.id);

            return (
              <View key={b.id} style={styles.businessCard}>
                <Image source={{ uri: b.coverImage }} style={styles.businessCover} />
                <View style={styles.businessBody}>
                  <Image source={{ uri: b.avatar }} style={styles.businessAvatarThumb} />
                  <View style={styles.businessTextCol}>
                    <View style={styles.businessNameRow}>
                      <Text style={styles.bizName} numberOfLines={1}>
                        {b.name}
                      </Text>
                      {b.verified && (
                        <Ionicons name="checkmark-circle" size={15} color={colors.accentCyan} />
                      )}
                    </View>
                    <Text style={styles.bizCategory}>
                      {b.businessType} · {b.city}, {b.state}
                    </Text>
                    <Text style={styles.bizRating}>
                      ⭐ {b.rating} ({b.reviewCount} reviews) · {b.followersCount.toLocaleString()} followers
                    </Text>
                  </View>
                </View>

                <View style={styles.bizActionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.followBtn,
                      isFollowing && styles.followBtnActive,
                    ]}
                    onPress={() => toggleFollowBusiness(b.id)}
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

                  <TouchableOpacity
                    style={[
                      styles.bizSaveBtn,
                      isSavedBiz && styles.bizSaveBtnActive,
                    ]}
                    onPress={() => toggleSaveBusiness(b.id)}
                  >
                    <Ionicons
                      name={isSavedBiz ? "bookmark" : "bookmark-outline"}
                      size={14}
                      color={isSavedBiz ? colors.primary : '#667085'}
                    />
                    <Text style={[styles.bizSaveBtnText, isSavedBiz && styles.bizSaveBtnTextActive]}>
                      {isSavedBiz ? 'Saved' : 'Save'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.viewBizBtn}
                    onPress={() => navigate('business_detail', { businessId: b.id })}
                  >
                    <Text style={styles.viewBizBtnText}>View Catalog</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: 12,
    paddingBottom: 24,
  },
  headerArea: {
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
  },
  tradeCategoriesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    padding: 14,
    marginBottom: 12,
  },
  tradeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tradeTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verticalBarAccent: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  tradeCategoriesTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  exploreAllLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  tradeCategoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  tradeCategoryTile: {
    width: '23%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  tradeIconSquircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tradeCategoryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 6,
    textAlign: 'center',
  },
  cityScroll: {
    gap: 6,
    marginBottom: 10,
  },
  cityChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  cityChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  cityChipInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.border,
  },
  cityChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cityChipTextActive: {
    color: '#FFFFFF',
  },
  cityChipTextInactive: {
    color: colors.textSecondary,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  sectionContainer: {
    marginTop: 4,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  listingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    overflow: 'hidden',
  },
  listingImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#F3F4F6',
  },
  listingDetails: {
    padding: 12,
  },
  listingTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  savePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  savePillBtnActive: {
    backgroundColor: colors.primaryLight,
    borderColor: '#C7D2FE',
  },
  savePillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#667085',
  },
  savePillTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  slaBadge: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  listingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  businessSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 3,
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 8,
  },
  priceHighlight: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  moqBadge: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  enquireButton: {
    flex: 2,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  enquireButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  detailsButton: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  detailsButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  businessCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    overflow: 'hidden',
  },
  businessCover: {
    width: '100%',
    height: 90,
    backgroundColor: '#E5E7EB',
  },
  businessBody: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  businessAvatarThumb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginTop: -20,
    backgroundColor: '#E5E7EB',
  },
  businessTextCol: {
    marginLeft: 10,
    flex: 1,
  },
  businessNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bizName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  bizCategory: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  bizRating: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bizActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 6,
  },
  followBtn: {
    flex: 1,
    backgroundColor: colors.primaryLight,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followBtnActive: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  followBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  followBtnTextActive: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  bizSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  bizSaveBtnActive: {
    backgroundColor: colors.primaryLight,
    borderColor: '#C7D2FE',
  },
  bizSaveBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#667085',
  },
  bizSaveBtnTextActive: {
    color: colors.primary,
  },
  viewBizBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewBizBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
