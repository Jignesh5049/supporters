import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Menu, Bell, ShieldCheck } from 'lucide-react-native';
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
          <Menu size={22} color="#475467" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigate('home')}
          style={styles.brandContainer}
          activeOpacity={0.8}
        >
          {/* Supporters Monogram Emblem */}
          <View style={styles.brandIcon}>
            <View style={styles.brandIconInner}>
              <ShieldCheck size={16} color={colors.accentCyan} />
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
            <Bell size={20} color="#475467" />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#F0F2F5',
    elevation: 2,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primary,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  brandIconInner: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  brandText: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FC',
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
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
});
