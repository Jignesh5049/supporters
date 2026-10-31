import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import { useApp } from '../context/AppContext';
import type { ScreenRoute } from '../lib/navigation/routes';
import { colors } from '../styles/theme';

export function BottomTabBar() {
  const insets = useSafeAreaInsets();
  const { navigate, unreadMessagesCount, setCreateModalOpen } = useApp();
  const pathname = usePathname();

  const tabs = [
    { key: 'home', path: '/', label: 'Home', icon: 'home' as const },
    { key: 'discover', path: '/discover', label: 'Discover', icon: 'compass' as const },
    { key: 'create', path: '/create', label: 'Create', icon: 'plus' as const, isAction: true },
    {
      key: 'messages',
      path: '/messages',
      label: 'Messages',
      icon: 'message-square' as const,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
    },
    { key: 'profile', path: '/profile', label: 'Profile', icon: 'user' as const },
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
                  <Feather name="plus" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.actionLabel}>Create</Text>
              </TouchableOpacity>
            );
          }

          const isActive = pathname === tab.path;

          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => navigate(tab.key as ScreenRoute)}
              style={styles.tabButton}
              activeOpacity={0.7}
            >
              <View style={styles.iconWrapper}>
                <Feather name={tab.icon} size={20} color={isActive ? colors.primary : '#667085'} />
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
    paddingHorizontal: 8,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    minWidth: 54,
  },
  iconWrapper: {
    position: 'relative',
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
    letterSpacing: -0.2,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  tabLabelInactive: {
    color: '#667085',
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accentCyan,
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
  },
  actionTabButton: {
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
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 1,
  },
});
