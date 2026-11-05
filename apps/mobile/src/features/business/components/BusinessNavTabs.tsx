import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing } from '../../../styles/theme';

export type BusinessTabType = 'products' | 'services' | 'posts' | 'reviews' | 'about';

interface BusinessNavTabsProps {
  activeTab: BusinessTabType;
  onTabChange: (tab: BusinessTabType) => void;
  productsCount: number;
  servicesCount: number;
  postsCount: number;
  reviewsCount?: number;
}

export function BusinessNavTabs({
  activeTab,
  onTabChange,
  productsCount,
  servicesCount,
  postsCount,
  reviewsCount = 3,
}: BusinessNavTabsProps) {
  const tabs: Array<{ key: BusinessTabType; label: string; count?: number }> = [
    { key: 'products', label: 'Products', count: productsCount },
    { key: 'services', label: 'Services', count: servicesCount },
    { key: 'posts', label: 'Updates', count: postsCount },
    { key: 'reviews', label: 'Reviews', count: reviewsCount },
    { key: 'about', label: 'About' },
  ];

  return (
    <View style={styles.tabsContainer}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabButton, isActive && styles.tabButtonActive]}
            onPress={() => onTabChange(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tab.label}
              {tab.count !== undefined ? ` (${tab.count})` : ''}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: colors.primary,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '800',
  },
});
