import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import {
  MessageSquare,
  Edit2,
  Package,
  Newspaper,
  Phone,
  Mail,
  MapPin,
  Eye,
} from 'lucide-react-native';
import { FeedPost, Product, UserProfile } from '../../../../mock';
import { FeedPostCard } from '../../../components/FeedPostCard';
import { colors, spacing, borderRadius } from '../../../styles/theme';

export type ProfileTabType = 'posts' | 'catalog' | 'about';

interface ProfileTabsProps {
  currentUser: UserProfile;
  posts: FeedPost[];
  products: Product[];
  onOpenProduct: (productId: string) => void;
  onContactProductSupplier: (product: Product) => void;
  onEditProfile: () => void;
}

export function ProfileTabs({
  currentUser,
  posts,
  products,
  onOpenProduct,
  onContactProductSupplier,
  onEditProfile,
}: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<ProfileTabType>('posts');

  const tabs: Array<{ key: ProfileTabType; label: string; count?: number }> = [
    { key: 'posts', label: 'Posts', count: posts.length },
    { key: 'catalog', label: 'Catalog', count: products.length },
    { key: 'about', label: 'About' },
  ];

  return (
    <View style={styles.container}>
      {/* Tab Buttons */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
                {tab.count !== undefined ? ` (${tab.count})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab Content */}
      <View style={styles.contentArea}>
        {activeTab === 'posts' && (
          <View>
            {posts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Newspaper size={36} color={colors.textMuted} style={{ marginBottom: 6 }} />
                <Text style={styles.emptyTitle}>No posts yet</Text>
                <Text style={styles.emptyText}>
                  Create an update or product launch to share here.
                </Text>
              </View>
            ) : (
              posts.map((post) => <FeedPostCard key={post.id} post={post} />)
            )}
          </View>
        )}

        {activeTab === 'catalog' && (
          <View>
            {products.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Package size={36} color={colors.textMuted} style={{ marginBottom: 6 }} />
                <Text style={styles.emptyTitle}>Catalog is empty</Text>
                <Text style={styles.emptyText}>
                  Add your manufactured products or supplies to showcase them.
                </Text>
              </View>
            ) : (
              <View style={styles.catalogGrid}>
                {products.map((p) => (
                  <View key={p.id} style={styles.catalogCard}>
                    <Image
                      source={{ uri: p.images[0] }}
                      style={styles.catalogImg}
                      contentFit="cover"
                      cachePolicy="disk"
                    />
                    <View style={styles.catalogBody}>
                      <Text style={styles.catalogTitle} numberOfLines={1}>
                        {p.title}
                      </Text>
                      <Text style={styles.catalogPrice}>₹{p.price.toLocaleString('en-IN')}</Text>
                      <Text style={styles.catalogMoq}>
                        MOQ: {p.minOrderQuantity} {p.unit}
                      </Text>

                      <View style={styles.catalogActionsRow}>
                        <TouchableOpacity
                          style={styles.viewProdBtn}
                          onPress={() => onOpenProduct(p.id)}
                          activeOpacity={0.8}
                        >
                          <Eye size={12} color={colors.textSecondary} />
                          <Text style={styles.viewProdText}>View</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.contactProdBtn}
                          onPress={() => onContactProductSupplier(p)}
                          activeOpacity={0.85}
                        >
                          <MessageSquare size={11} color="#FFFFFF" />
                          <Text style={styles.contactProdText}>Contact</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === 'about' && (
          <View style={styles.aboutCard}>
            <View style={styles.aboutHeaderRow}>
              <Text style={styles.aboutHeading}>Business Profile & Contact</Text>
              <TouchableOpacity
                onPress={onEditProfile}
                style={styles.aboutEditBtn}
                activeOpacity={0.8}
              >
                <Edit2 size={13} color={colors.primary} />
                <Text style={styles.aboutEditText}>Edit</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.aboutBody}>
              {currentUser.bio || 'No business description provided yet.'}
            </Text>

            <View style={styles.detailList}>
              <View style={styles.detailRow}>
                <Phone size={14} color={colors.textMuted} />
                <Text style={styles.detailLabel}>Mobile:</Text>
                <Text style={styles.detailValue}>{currentUser.phone || 'Not set'}</Text>
              </View>

              <View style={styles.detailRow}>
                <Mail size={14} color={colors.textMuted} />
                <Text style={styles.detailLabel}>Email:</Text>
                <Text style={styles.detailValue}>{currentUser.email || 'Not set'}</Text>
              </View>

              <View style={styles.detailRow}>
                <MapPin size={14} color={colors.textMuted} />
                <Text style={styles.detailLabel}>Location:</Text>
                <Text style={styles.detailValue}>
                  {currentUser.city}, {currentUser.state}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: colors.primary,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  contentArea: {
    paddingVertical: spacing.sm,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  catalogGrid: {
    paddingHorizontal: spacing.md,
    gap: 12,
  },
  catalogCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  catalogImg: {
    width: '100%',
    height: 180,
    backgroundColor: colors.surface,
  },
  catalogBody: {
    padding: spacing.md,
  },
  catalogTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  catalogPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 3,
  },
  catalogMoq: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 10,
  },
  catalogActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  viewProdBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  viewProdText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  contactProdBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  contactProdText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  aboutCard: {
    marginHorizontal: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  aboutHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  aboutHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  aboutEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  aboutEditText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  aboutBody: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
    marginBottom: 14,
  },
  detailList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 12,
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    width: 65,
  },
  detailValue: {
    fontSize: 12,
    color: colors.textPrimary,
    flex: 1,
  },
});
