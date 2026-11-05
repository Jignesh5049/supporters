import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Sparkles, X, Check } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';

export function SuggestedBusinessesWidget() {
  const { businesses, followedBusinessIds, toggleFollowBusiness, navigate, currentUser } = useApp();
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  // Filter out currentUser's own business and dismissed cards
  const suggestedList = businesses.filter(
    (b) => b.id !== currentUser.businessId && !dismissedIds.includes(b.id),
  );

  if (suggestedList.length === 0) {
    return null;
  }

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => [...prev, id]);
  };

  return (
    <View style={styles.container}>
      {/* Instagram-style Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <Sparkles size={14} color={colors.primary} />
          <Text style={styles.sectionTitle}>Suggested for you</Text>
        </View>

        <TouchableOpacity
          onPress={() => navigate('discover')}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.seeAllText}>See all</Text>
        </TouchableOpacity>
      </View>

      {/* Horizontal Carousel of Business Profile Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {suggestedList.map((biz) => {
          const isFollowing = followedBusinessIds.includes(biz.id);

          return (
            <View key={biz.id} style={styles.card}>
              {/* Dismiss 'X' Button */}
              <TouchableOpacity
                onPress={() => handleDismiss(biz.id)}
                style={styles.dismissBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={13} color="#94A3B8" />
              </TouchableOpacity>

              {/* Avatar with Verified Badge */}
              <TouchableOpacity
                onPress={() => navigate('business_detail', { businessId: biz.id })}
                style={styles.avatarContainer}
                activeOpacity={0.8}
              >
                <Image source={{ uri: biz.avatar }} style={styles.avatar} />
                {biz.verified && (
                  <View style={styles.verifiedDot}>
                    <Check size={8} color="#FFFFFF" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>

              {/* Business Name */}
              <TouchableOpacity
                onPress={() => navigate('business_detail', { businessId: biz.id })}
                activeOpacity={0.8}
                style={styles.nameContainer}
              >
                <Text style={styles.businessName} numberOfLines={1}>
                  {biz.name}
                </Text>
              </TouchableOpacity>

              {/* Subtitle / Category */}
              <Text style={styles.categoryText} numberOfLines={1}>
                {biz.category} · {biz.city}
              </Text>

              {/* Followers count */}
              <Text style={styles.followersText} numberOfLines={1}>
                {biz.followersCount} followers
              </Text>

              {/* Action: Follow / Following Button */}
              <TouchableOpacity
                onPress={() => toggleFollowBusiness(biz.id)}
                style={[
                  styles.followButton,
                  isFollowing ? styles.followingButton : styles.notFollowingButton,
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.followButtonText,
                    isFollowing ? styles.followingButtonText : styles.notFollowingButtonText,
                  ]}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 10,
  },
  card: {
    width: 144,
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    position: 'relative',
  },
  dismissBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    padding: 3,
    zIndex: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginTop: 4,
    marginBottom: 8,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#E2E8F0',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  verifiedDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accentCyan,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  nameContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  businessName: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  categoryText: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
    width: '100%',
  },
  followersText: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 10,
  },
  followButton: {
    width: '100%',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFollowingButton: {
    backgroundColor: colors.primary,
  },
  followingButton: {
    backgroundColor: '#E2E8F0',
  },
  followButtonText: {
    fontSize: 11,
    fontWeight: '700',
  },
  notFollowingButtonText: {
    color: '#FFFFFF',
  },
  followingButtonText: {
    color: colors.textPrimary,
  },
});
