import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Check, Eye, Edit2 } from 'lucide-react-native';
import { colors } from '../../../styles/theme';
import type { Business } from '../../../../mock';

interface HubBannerHeaderProps {
  business: Business;
  onViewPublicProfile: () => void;
  onEditProfile: () => void;
}

export function HubBannerHeader({
  business,
  onViewPublicProfile,
  onEditProfile,
}: HubBannerHeaderProps) {
  return (
    <View style={styles.bannerCard}>
      <Image
        source={{ uri: business.coverImage }}
        style={styles.coverImage}
        contentFit="cover"
        transition={200}
      />

      <View style={styles.content}>
        <View style={styles.avatarRow}>
          <View style={styles.avatarWrapper}>
            <Image
              source={{ uri: business.avatar }}
              style={styles.avatar}
              contentFit="cover"
              transition={200}
            />
            {business.verified && (
              <View style={styles.verifiedDot}>
                <Check size={10} color="#FFFFFF" strokeWidth={3} />
              </View>
            )}
          </View>

          <View style={styles.actionsCol}>
            <TouchableOpacity
              style={styles.publicBtn}
              onPress={onViewPublicProfile}
              activeOpacity={0.8}
            >
              <Eye size={13} color="#FFFFFF" />
              <Text style={styles.publicBtnText}>View Public Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.editBtn} onPress={onEditProfile} activeOpacity={0.8}>
              <Edit2 size={12} color={colors.primary} />
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.businessName}>{business.name}</Text>
          {business.verified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>Verified Gold</Text>
            </View>
          )}
        </View>

        <Text style={styles.businessCategory}>
          {business.category} · {business.businessType} · {business.city}
        </Text>

        <Text style={styles.aboutSnippet} numberOfLines={2}>
          {business.about}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  coverImage: {
    width: '100%',
    height: 110,
    backgroundColor: '#E2E8F0',
  },
  content: {
    padding: 14,
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: -38,
    marginBottom: 10,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#F1F5F9',
  },
  verifiedDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#0D9488',
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  actionsCol: {
    flexDirection: 'row',
    gap: 8,
  },
  publicBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
  },
  publicBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF0FA',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
  },
  editBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  businessName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  verifiedBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  businessCategory: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  aboutSnippet: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
});
