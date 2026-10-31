import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../../styles/theme';
import type { PostType } from '../../../../mock';

interface CreatePostTabsProps {
  activeTab: PostType;
  onSelectTab: (tab: PostType) => void;
}

const TABS: { key: PostType; label: string }[] = [
  { key: 'update', label: 'Update' },
  { key: 'product', label: 'Product' },
  { key: 'service', label: 'Service' },
  { key: 'offer', label: 'Offer' },
];

export function CreatePostTabs({ activeTab, onSelectTab }: CreatePostTabsProps) {
  return (
    <View style={styles.tabBar}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onSelectTab(tab.key)}
            style={[styles.tabItem, isActive && styles.tabItemActive]}
            activeOpacity={0.75}
          >
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: colors.primary,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
});
