import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Image } from 'expo-image';
import { ArrowLeft, Search, X, CheckCircle2 } from 'lucide-react-native';
import { Business } from '../../../../mock';
import { colors, spacing, borderRadius } from '../../../styles/theme';

interface FollowingModalProps {
  visible: boolean;
  onClose: () => void;
  username: string;
  businesses: Business[];
  followedBusinessIds: string[];
  onToggleFollow: (businessId: string) => void;
  onNavigateBusiness: (businessId: string) => void;
}

export function FollowingModal({
  visible,
  onClose,
  username,
  businesses,
  followedBusinessIds,
  onToggleFollow,
  onNavigateBusiness,
}: FollowingModalProps) {
  const [search, setSearch] = useState('');

  const followedList = businesses.filter((b) => {
    const isFollowed = followedBusinessIds.includes(b.id) || b.id === 'b-1' || b.id === 'b-2';
    if (!isFollowed) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      b.category.toLowerCase().includes(q) ||
      b.city.toLowerCase().includes(q)
    );
  });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.backBtn}
            accessibilityLabel="Close following list"
          >
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>Following</Text>
            <Text style={styles.subtitle}>@{username}</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Search size={15} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search following businesses..."
            placeholderTextColor={colors.textMuted}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={15} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* List */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.listScroll}
          contentContainerStyle={styles.listContent}
        >
          {followedList.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No businesses found</Text>
            </View>
          ) : (
            followedList.map((biz) => {
              const isFollowed = followedBusinessIds.includes(biz.id);
              return (
                <View key={biz.id} style={styles.bizRow}>
                  <TouchableOpacity
                    style={styles.bizInfo}
                    onPress={() => {
                      onClose();
                      onNavigateBusiness(biz.id);
                    }}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: biz.avatar }}
                      style={styles.avatar}
                      contentFit="cover"
                      cachePolicy="disk"
                    />
                    <View style={styles.bizMeta}>
                      <View style={styles.nameRow}>
                        <Text style={styles.bizName} numberOfLines={1}>
                          {biz.name}
                        </Text>
                        {biz.verified && <CheckCircle2 size={13} color={colors.primary} />}
                      </View>
                      <Text style={styles.bizCategory} numberOfLines={1}>
                        {biz.category} · {biz.city}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.followBtn,
                      isFollowed ? styles.followBtnActive : styles.followBtnInactive,
                    ]}
                    onPress={() => onToggleFollow(biz.id)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.followBtnText,
                        isFollowed ? styles.followBtnTextActive : styles.followBtnTextInactive,
                      ]}
                    >
                      {isFollowed ? 'Following' : 'Follow'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    padding: 0,
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bizRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  bizInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
  },
  bizMeta: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bizName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  bizCategory: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  followBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
  followBtnActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  followBtnInactive: {
    backgroundColor: colors.primary,
  },
  followBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  followBtnTextActive: {
    color: colors.textPrimary,
  },
  followBtnTextInactive: {
    color: '#FFFFFF',
  },
  emptyWrap: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
