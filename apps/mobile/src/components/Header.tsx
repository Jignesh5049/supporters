import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';

export function Header() {
  const {
    unreadNotificationsCount,
    currentUser,
    setDrawerOpen,
    navigate,
    isHeaderVisible,
    currentRoute,
  } = useApp();

  const anim = useRef(new Animated.Value(1)).current;
  const shouldShow = currentRoute !== 'home' || isHeaderVisible;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: shouldShow ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [shouldShow]);

  const height = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 56],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <Animated.View
      style={[
        styles.headerContainer,
        {
          height,
          opacity,
          borderBottomWidth: shouldShow ? 1 : 0,
          overflow: 'hidden',
        },
      ]}
    >
      {/* Left: Hamburger menu & Supporters Brand Logo */}
      <View style={styles.leftSection}>
        <TouchableOpacity
          onPress={() => setDrawerOpen(true)}
          style={styles.iconButton}
          activeOpacity={0.7}
          accessibilityLabel="Open Navigation Menu"
        >
          <Feather name="menu" size={22} color="#475467" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigate('home')}
          style={styles.brandContainer}
          activeOpacity={0.8}
        >
          {/* Supporters Monogram Emblem */}
          <View style={styles.brandIcon}>
            <View style={styles.brandIconInner}>
              <Ionicons name="shield-checkmark" size={16} color={colors.accentCyan} />
            </View>
          </View>
          <Text style={styles.brandText}>Supporters</Text>
        </TouchableOpacity>
      </View>

      {/* Right: Notifications */}
      <View style={styles.rightSection}>
        {currentRoute !== 'notifications' && (
          <TouchableOpacity
            onPress={() => navigate('notifications')}
            style={styles.iconButton}
            activeOpacity={0.7}
            accessibilityLabel="Notifications"
          >
            <Feather name="bell" size={20} color="#475467" />
            {unreadNotificationsCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>{unreadNotificationsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    height: 56,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    zIndex: 20,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandIconInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
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
  },
  avatarButton: {
    marginLeft: 4,
    position: 'relative',
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
  },
  verifiedDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: colors.accentCyan,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});
