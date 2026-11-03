import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Bookmark, CheckCircle2, UserCheck, UserPlus } from 'lucide-react-native';
import { colors } from '../../../styles/theme';
import type { Business } from '../../../../mock';

interface DiscoverBusinessCardProps {
  business: Business;
  isFollowing: boolean;
  isSaved: boolean;
  onToggleFollow: (id: string) => void;
  onToggleSave: (id: string) => void;
  onViewCatalog: (id: string) => void;
}

export function DiscoverBusinessCard({
  business,
  isFollowing,
  isSaved,
  onToggleFollow,
  onToggleSave,
  onViewCatalog,
}: DiscoverBusinessCardProps) {
  return (
    <View style={styles.card}>
      <Image
        source={{ uri: business.coverImage }}
        style={styles.cover}
        contentFit="cover"
        transition={200}
      />
      <View style={styles.body}>
        <Image
          source={{ uri: business.avatar }}
          style={styles.avatar}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.textCol}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {business.name}
            </Text>
            {business.verified && (
              <CheckCircle2 size={15} color={colors.accentCyan} fill={colors.accentCyan} />
            )}
          </View>
          <Text style={styles.category}>
            {business.businessType} · {business.city}, {business.state}
          </Text>
          <Text style={styles.rating}>
            ⭐ {business.rating} ({business.reviewCount} reviews) ·{' '}
            {business.followersCount.toLocaleString()} followers
          </Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.followBtn, isFollowing && styles.followBtnActive]}
          onPress={() => onToggleFollow(business.id)}
          activeOpacity={0.8}
        >
          {isFollowing ? (
            <View style={styles.btnRow}>
              <UserCheck size={13} color="#065F46" />
              <Text style={styles.followBtnTextActive}>Following</Text>
            </View>
          ) : (
            <View style={styles.btnRow}>
              <UserPlus size={13} color={colors.primary} />
              <Text style={styles.followBtnText}>Follow</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveBtn, isSaved && styles.saveBtnActive]}
          onPress={() => onToggleSave(business.id)}
          activeOpacity={0.8}
        >
          <Bookmark
            size={13}
            color={isSaved ? colors.primary : '#667085'}
            fill={isSaved ? colors.primary : 'transparent'}
          />
          <Text style={[styles.saveBtnText, isSaved && styles.saveBtnTextActive]}>
            {isSaved ? 'Saved' : 'Save'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.viewCatalogBtn}
          onPress={() => onViewCatalog(business.id)}
          activeOpacity={0.8}
        >
          <Text style={styles.viewCatalogBtnText}>View Catalog</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
    overflow: 'hidden',
  },
  cover: {
    width: '100%',
    height: 90,
    backgroundColor: '#F3F4F6',
  },
  body: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginTop: -24,
    backgroundColor: '#E5E7EB',
  },
  textCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  category: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rating: {
    fontSize: 11,
    color: '#667085',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  followBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#EEF0FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  followBtnActive: {
    backgroundColor: '#ECFDF5',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  followBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  followBtnTextActive: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065F46',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveBtnActive: {
    backgroundColor: '#EEF0FA',
    borderColor: colors.primary,
  },
  saveBtnText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#667085',
  },
  saveBtnTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  viewCatalogBtn: {
    flex: 1.2,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewCatalogBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
