import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { NotificationCategory, NotificationItem } from '../../mock';
import { colors } from '../styles/theme';

export function NotificationsScreen() {
  const {
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    navigate
  } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory>('All');

  const categories: NotificationCategory[] = [
    'All',
    'Business',
    'Messages',
    'Enquiries',
    'Referrals',
    'Subscription',
  ];

  const filtered = notifications.filter(
    (n) => selectedCategory === 'All' || n.category === selectedCategory
  );

  const groups: Array<'Today' | 'Yesterday' | 'Earlier'> = ['Today', 'Yesterday', 'Earlier'];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Area */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.heading}>Notifications</Text>
          <TouchableOpacity
            onPress={markAllNotificationsAsRead}
            style={styles.markAllBtn}
          >
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
        </View>

        {/* Category Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.catPill,
                  isSelected ? styles.catPillActive : styles.catPillInactive,
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.catText,
                    isSelected ? styles.catTextActive : styles.catTextInactive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Notifications grouped */}
      <View style={styles.listContent}>
        {groups.map((group) => {
          const groupItems = filtered.filter((n) => n.timeGroup === group);
          if (groupItems.length === 0) return null;

          return (
            <View key={group} style={styles.groupSection}>
              <Text style={styles.groupHeader}>{group.toUpperCase()}</Text>

              {groupItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => {
                    markNotificationAsRead(item.id);
                    if (item.actionUrl?.includes('messages')) navigate('messages');
                    else if (item.actionUrl?.includes('referral')) navigate('referral');
                    else if (item.actionUrl?.includes('subscription')) navigate('subscription');
                    else navigate('discover');
                  }}
                  style={[
                    styles.notifCard,
                    !item.read && styles.notifCardUnread,
                  ]}
                  activeOpacity={0.75}
                >
                  <View style={styles.avatarCol}>
                    {item.avatar ? (
                      <Image source={{ uri: item.avatar }} style={styles.avatarImg} />
                    ) : (
                      <View style={styles.iconPlaceholder}>
                        <Feather name="bell" size={16} color={colors.primary} />
                      </View>
                    )}
                  </View>

                  <View style={styles.notifContent}>
                    <View style={styles.notifHeaderRow}>
                      <Text style={styles.notifTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {!item.read && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.notifDesc} numberOfLines={2}>
                      {item.description}
                    </Text>
                    <Text style={styles.notifTime}>{item.time}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          );
        })}

        {filtered.length === 0 && (
          <View style={styles.emptyContainer}>
            <Feather name="bell-off" size={32} color="#9CA3AF" />
            <Text style={styles.emptyText}>No notifications in this category</Text>
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
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: 14,
    paddingBottom: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  heading: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  markAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  markAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  catPillActive: {
    backgroundColor: colors.primary,
  },
  catPillInactive: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catText: {
    fontSize: 11,
    fontWeight: '700',
  },
  catTextActive: {
    color: '#FFFFFF',
  },
  catTextInactive: {
    color: colors.textSecondary,
  },
  listContent: {
    padding: 12,
    paddingBottom: 24,
  },
  groupSection: {
    marginBottom: 16,
  },
  groupHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  notifCardUnread: {
    backgroundColor: '#F8FAFF',
    borderColor: '#C7D2FE',
  },
  avatarCol: {
    marginRight: 12,
  },
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  iconPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifContent: {
    flex: 1,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: 6,
  },
  notifDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  notifTime: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 30,
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
