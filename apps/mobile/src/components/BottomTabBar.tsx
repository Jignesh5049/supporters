import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Home, Compass, Plus, MessageSquare, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { useUnreadMessagesCount } from '../features/messages/hooks/use-conversations';
import { colors } from '../styles/theme';

export function BottomTabBar() {
  const insets = useSafeAreaInsets();
  const { currentRoute, navigate, setCreateModalOpen } = useApp();
  const unreadMessagesCount = useUnreadMessagesCount();

  const tabs = [
    { key: 'home', label: 'Home', Icon: Home },
    { key: 'discover', label: 'Discover', Icon: Compass },
    { key: 'create', label: 'Create', Icon: Plus, isAction: true },
    {
      key: 'messages',
      label: 'Messages',
      Icon: MessageSquare,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
    },
    { key: 'profile', label: 'Profile', Icon: User },
  ];

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          if (tab.isAction) {
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setCreateModalOpen(true)}
                style={styles.actionTabButton}
                activeOpacity={0.85}
              >
                <View style={styles.actionIconContainer}>
                  <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
                </View>
                <Text style={styles.actionLabel}>Create</Text>
              </TouchableOpacity>
            );
          }

          const isActive = currentRoute === tab.key;
          const TabIcon = tab.Icon;

          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => navigate(tab.key as any)}
              style={styles.tabButton}
              activeOpacity={0.7}
            >
              <View style={styles.iconWrapper}>
                <TabIcon
                  size={20}
                  color={isActive ? colors.primary : '#667085'}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {tab.badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{tab.badge}</Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  isActive ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 50,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  iconWrapper: {
    position: 'relative',
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
    letterSpacing: -0.2,
  },
  tabLabelActive: {
    fontWeight: '700',
    color: colors.primary,
  },
  tabLabelInactive: {
    fontWeight: '500',
    color: '#667085',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accentMagenta,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 11,
  },
  actionTabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16,
  },
  actionIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
  },
});
