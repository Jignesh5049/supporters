import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Image } from 'expo-image';
import {
  ShieldCheck,
  MapPin,
  Users,
  MessageSquare,
  Phone,
  Share2,
  Instagram,
  UserPlus,
  UserCheck,
} from 'lucide-react-native';
import { Business } from '../../../mock';
import { colors, spacing, borderRadius } from '../../../styles/theme';

interface BusinessHeroProps {
  business: Business;
  isFollowing: boolean;
  onToggleFollow: () => void;
  onOpenFollowers: () => void;
  onOpenChat: () => void;
  onOpenShare: () => void;
}

export function BusinessHero({
  business,
  isFollowing,
  onToggleFollow,
  onOpenFollowers,
  onOpenChat,
  onOpenShare,
}: BusinessHeroProps) {
  const handleOpenInstagram = () => {
    if (!business.instagram) return;
    const handle = business.instagram.replace('@', '').trim();
    const url = business.instagram.startsWith('http')
      ? business.instagram
      : `https://instagram.com/${handle}`;
    Linking.openURL(url).catch(() => {});
  };

  const handleCall = () => {
    if (business.phone) {
      Linking.openURL(`tel:${business.phone}`).catch(() => {});
    }
  };

  return (
    <View style={styles.container}>
      {/* Cover Banner */}
      <Image
        source={{ uri: business.coverImage }}
        style={styles.coverImage}
        contentFit="cover"
        cachePolicy="disk"
      />

      {/* Floating Avatar & Details */}
      <View style={styles.content}>
        <View style={styles.avatarRow}>
          <Image
            source={{ uri: business.avatar }}
            style={styles.avatar}
            contentFit="cover"
            cachePolicy="disk"
          />

          <View style={styles.avatarActions}>
            <TouchableOpacity
              style={[styles.followButton, isFollowing && styles.followButtonActive]}
              onPress={onToggleFollow}
              activeOpacity={0.8}
            >
              {isFollowing ? (
                <>
                  <UserCheck size={15} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.followButtonTextActive}>Following</Text>
                </>
              ) : (
                <>
                  <UserPlus size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.followButtonText}>Follow</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionIconButton}
              onPress={onOpenShare}
              accessibilityLabel="Share Business"
            >
              <Share2 size={16} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Business Title & Verified Badge */}
        <View style={styles.titleRow}>
          <Text style={styles.businessName}>{business.name}</Text>
          {business.verified && (
            <ShieldCheck size={18} color={colors.primary} style={{ marginLeft: 6 }} />
          )}
        </View>

        <Text style={styles.categoryText}>
          {business.category} • {business.businessType}
        </Text>

        {/* Location & Followers Bar */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <MapPin size={13} color={colors.textSecondary} style={{ marginRight: 3 }} />
            <Text style={styles.metaText}>
              {business.city}, {business.state}
            </Text>
          </View>

          <TouchableOpacity style={styles.metaItem} onPress={onOpenFollowers}>
            <Users size={13} color={colors.primary} style={{ marginRight: 3 }} />
            <Text style={[styles.metaText, { color: colors.primary, fontWeight: '700' }]}>
              {business.followersCount} Followers
            </Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons Row */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.chatButton} onPress={onOpenChat} activeOpacity={0.85}>
            <MessageSquare size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.chatButtonText}>Chat with Supplier</Text>
          </TouchableOpacity>

          {business.showPhone && business.phone ? (
            <TouchableOpacity style={styles.callButton} onPress={handleCall} activeOpacity={0.85}>
              <Phone size={16} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.callButtonText}>Call</Text>
            </TouchableOpacity>
          ) : null}

          {business.instagram ? (
            <TouchableOpacity
              style={styles.instaButton}
              onPress={handleOpenInstagram}
              activeOpacity={0.85}
            >
              <Instagram size={16} color="#E1306C" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  coverImage: {
    width: '100%',
    height: 140,
    backgroundColor: colors.gray100,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    marginTop: -36,
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.xs,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: colors.gray100,
  },
  avatarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    height: 36,
    borderRadius: borderRadius.full,
  },
  followButtonActive: {
    backgroundColor: colors.primaryLight,
  },
  followButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  followButtonTextActive: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  actionIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  businessName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  categoryText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: 6,
    marginBottom: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    height: 42,
    borderRadius: borderRadius.md,
  },
  chatButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    height: 42,
    borderRadius: borderRadius.md,
  },
  callButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  instaButton: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.md,
    backgroundColor: '#FDF2F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
