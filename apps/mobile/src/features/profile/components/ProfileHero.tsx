import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Edit3, Settings, Gift, ShieldCheck, MapPin, Calendar } from 'lucide-react-native';
import { UserProfile } from '../../../../mock';
import { colors, spacing, borderRadius } from '../../../styles/theme';

interface ProfileHeroProps {
  currentUser: UserProfile;
  onEditProfile: () => void;
  onOpenSettings: () => void;
  onOpenReferral: () => void;
  onUpdateAvatar: (uri: string) => void;
  onUpdateCover: (uri: string) => void;
}

export function ProfileHero({
  currentUser,
  onEditProfile,
  onOpenSettings,
  onOpenReferral,
  onUpdateAvatar,
  onUpdateCover,
}: ProfileHeroProps) {
  const handlePickCover = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });
      if (!res.canceled && res.assets?.[0]?.uri) {
        onUpdateCover(res.assets[0].uri);
      }
    } catch {
      // Ignored
    }
  };

  const handlePickAvatar = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!res.canceled && res.assets?.[0]?.uri) {
        onUpdateAvatar(res.assets[0].uri);
      }
    } catch {
      // Ignored
    }
  };

  return (
    <View style={styles.container}>
      {/* Cover Image Banner */}
      <View style={styles.coverContainer}>
        <Image
          source={{ uri: currentUser.coverImage }}
          style={styles.coverImage}
          contentFit="cover"
          cachePolicy="disk"
        />
        <TouchableOpacity
          style={styles.coverEditBtn}
          onPress={handlePickCover}
          activeOpacity={0.8}
          accessibilityLabel="Edit cover photo"
        >
          <Camera size={13} color="#FFFFFF" />
          <Text style={styles.coverEditText}>Edit Cover</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Header Details */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarRow}>
          <View style={styles.avatarWrapper}>
            <Image
              source={{ uri: currentUser.avatar }}
              style={styles.avatar}
              contentFit="cover"
              cachePolicy="disk"
            />
            <TouchableOpacity
              style={styles.avatarCameraBtn}
              onPress={handlePickAvatar}
              activeOpacity={0.8}
              accessibilityLabel="Change avatar image"
            >
              <Camera size={11} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.verifiedDot}>
              <ShieldCheck size={12} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={onEditProfile}
              style={styles.editProfileBtnPrimary}
              activeOpacity={0.8}
            >
              <Edit3 size={13} color="#FFFFFF" />
              <Text style={styles.editProfileBtnPrimaryText}>Edit Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onOpenSettings}
              style={styles.iconBtn}
              activeOpacity={0.8}
              accessibilityLabel="Settings"
            >
              <Settings size={15} color={colors.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onOpenReferral}
              style={styles.inviteBtn}
              activeOpacity={0.8}
              accessibilityLabel="Invite referrals"
            >
              <Gift size={13} color="#FFFFFF" />
              <Text style={styles.inviteText}>Invite</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* User Titles & Meta */}
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.nameText}>{currentUser.name}</Text>
            <View style={styles.verifiedBadge}>
              <ShieldCheck size={11} color={colors.primary} />
              <Text style={styles.verifiedBadgeText}>Verified</Text>
            </View>
          </View>
          <Text style={styles.usernameText}>@{currentUser.username}</Text>

          {Boolean(currentUser.bio) && <Text style={styles.bioText}>{currentUser.bio}</Text>}

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MapPin size={12} color={colors.textMuted} />
              <Text style={styles.metaText}>
                {currentUser.city}, {currentUser.state}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Calendar size={12} color={colors.textMuted} />
              <Text style={styles.metaText}>Joined {currentUser.memberSince}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
  },
  coverContainer: {
    height: 180,
    width: '100%',
    backgroundColor: '#0F172A',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverEditBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  coverEditText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: -44,
    marginBottom: 10,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3.5,
    borderColor: '#FFFFFF',
    backgroundColor: '#E2E8F0',
  },
  avatarCameraBtn: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: colors.primary,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  verifiedDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: colors.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editProfileBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
  },
  editProfileBtnPrimaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
  },
  inviteText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userInfo: {
    marginTop: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nameText: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  usernameText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 1,
  },
  bioText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
    marginTop: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
