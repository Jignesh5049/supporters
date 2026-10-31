import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Bookmark, Package, Wrench, Briefcase } from 'lucide-react-native';
import { EmptyState } from '@supporters/ui-native/patterns';
import { useApp } from '../context/AppContext';
import { FeedPostCard } from '../components/FeedPostCard';
import { colors } from '../styles/theme';

export function SavedScreen() {
  const {
    posts,
    products,
    services,
    businesses,
    savedPostIds,
    savedProductIds,
    savedServiceIds,
    savedBusinessIds,
    toggleSaveProduct,
    toggleSaveService,
    toggleSaveBusiness,
    openEnquiryModal,
    openConversationWithBusiness,
    navigate,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'posts' | 'products' | 'services' | 'businesses'>(
    'posts',
  );

  const savedPosts = posts.filter((p) => savedPostIds.includes(p.id));
  const savedProducts = products.filter((p) => savedProductIds.includes(p.id));
  const savedServices = services.filter((s) => savedServiceIds.includes(s.id));
  const savedBusinesses = businesses.filter((b) => savedBusinessIds.includes(b.id));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved Collection</Text>
        <Text style={styles.headerSub}>Bookmarked posts, supplier catalogs and quotations</Text>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {[
            { key: 'posts', label: `Posts (${savedPosts.length})` },
            { key: 'products', label: `Products (${savedProducts.length})` },
            { key: 'services', label: `Services (${savedServices.length})` },
            { key: 'businesses', label: `Sellers (${savedBusinesses.length})` },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key as any)}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        {activeTab === 'posts' && (
          <View>
            {savedPosts.length === 0 ? (
              <EmptyState
                icon={<Bookmark size={32} color="#9CA3AF" />}
                title="No saved posts yet"
                description="Tap the bookmark icon on any trade post to save it for quick reference."
                actionLabel="Explore Feed"
                onAction={() => navigate('home')}
                className="my-6"
              />
            ) : (
              savedPosts.map((post) => <FeedPostCard key={post.id} post={post} />)
            )}
          </View>
        )}

        {activeTab === 'products' && (
          <View style={styles.itemsList}>
            {savedProducts.length === 0 ? (
              <EmptyState
                icon={<Package size={32} color="#9CA3AF" />}
                title="No saved products yet"
                description="Browse products in the marketplace and save items to review later."
                actionLabel="Discover Products"
                onAction={() => navigate('discover')}
                className="my-6"
              />
            ) : (
              savedProducts.map((p) => (
                <View key={p.id} style={styles.itemCard}>
                  <Image source={{ uri: p.images[0] }} style={styles.itemImg} />
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemTitle} numberOfLines={2}>
                      {p.title}
                    </Text>
                    <Text style={styles.itemSeller}>
                      {p.businessName} · {p.businessCity}
                    </Text>
                    <Text style={styles.itemPrice}>
                      ₹{p.price.toLocaleString('en-IN')} (MOQ: {p.minOrderQuantity} {p.unit})
                    </Text>

                    <View style={styles.itemActions}>
                      <TouchableOpacity
                        style={styles.viewProductBtn}
                        onPress={() => navigate('product_detail', { productId: p.id })}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.viewProductBtnText}>View Product</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.quoteBtn}
                        onPress={() =>
                          openConversationWithBusiness(p.businessId, {
                            initialMessage: `Namaste! I am interested in "${p.title}" (₹${p.price.toLocaleString('en-IN')}). Please share wholesale pricing and delivery schedule.`,
                            attachedProduct: p,
                          })
                        }
                        activeOpacity={0.8}
                      >
                        <Text style={styles.quoteBtnText}>Contact Supplier</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => toggleSaveProduct(p.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.removeBtnText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'services' && (
          <View style={styles.itemsList}>
            {savedServices.length === 0 ? (
              <EmptyState
                icon={<Wrench size={32} color="#9CA3AF" />}
                title="No saved services yet"
                description="Bookmark professional trade and industrial services."
                actionLabel="Browse Services"
                onAction={() => navigate('discover')}
                className="my-6"
              />
            ) : (
              savedServices.map((s) => (
                <View key={s.id} style={styles.itemCard}>
                  <Image source={{ uri: s.images[0] }} style={styles.itemImg} />
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemTitle}>{s.title}</Text>
                    <Text style={styles.itemSeller}>{s.businessName}</Text>
                    <Text style={styles.itemPrice}>
                      From ₹{s.startingPrice.toLocaleString('en-IN')} {s.priceUnit}
                    </Text>

                    <View style={styles.itemActions}>
                      <TouchableOpacity
                        style={styles.quoteBtn}
                        onPress={() =>
                          openEnquiryModal({
                            title: s.title,
                            businessName: s.businessName,
                            businessId: s.businessId,
                          })
                        }
                      >
                        <Text style={styles.quoteBtnText}>Enquire</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => toggleSaveService(s.id)}
                      >
                        <Text style={styles.removeBtnText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'businesses' && (
          <View style={styles.itemsList}>
            {savedBusinesses.length === 0 ? (
              <EmptyState
                icon={<Briefcase size={32} color="#9CA3AF" />}
                title="No saved sellers yet"
                description="Follow verified manufacturers and suppliers across India."
                actionLabel="Find Suppliers"
                onAction={() => navigate('discover')}
                className="my-6"
              />
            ) : (
              savedBusinesses.map((b) => (
                <View key={b.id} style={styles.itemCard}>
                  <Image source={{ uri: b.avatar }} style={styles.bizAvatar} />
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemTitle}>{b.name}</Text>
                    <Text style={styles.itemSeller}>
                      {b.businessType} · {b.city}, {b.state}
                    </Text>
                    <Text style={styles.itemPrice}>⭐ {b.rating} rating</Text>

                    <View style={styles.itemActions}>
                      <TouchableOpacity
                        style={styles.quoteBtn}
                        onPress={() => navigate('business_detail', { businessId: b.id })}
                      >
                        <Text style={styles.quoteBtnText}>View Catalog</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => toggleSaveBusiness(b.id)}
                      >
                        <Text style={styles.removeBtnText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: 14,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 12,
  },
  tabRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  scrollArea: {
    padding: 12,
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 30,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  itemsList: {
    gap: 10,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    gap: 10,
  },
  itemImg: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
  },
  bizAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E5E7EB',
  },
  itemDetails: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  itemSeller: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 3,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  viewProductBtn: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  viewProductBtnText: {
    color: '#334155',
    fontSize: 10,
    fontWeight: '700',
  },
  quoteBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  quoteBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  removeBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  removeBtnText: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '700',
  },
});
