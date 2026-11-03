import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Search, XCircle } from 'lucide-react-native';
import { colors } from '../../../styles/theme';
import { CITIES } from '../../../../mock';

export type DiscoverTab = 'all' | 'products' | 'services' | 'businesses';

interface DiscoverHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  activeTab: DiscoverTab;
  setActiveTab: (tab: DiscoverTab) => void;
}

export function DiscoverHeader({
  searchQuery,
  setSearchQuery,
  selectedCity,
  setSelectedCity,
  activeTab,
  setActiveTab,
}: DiscoverHeaderProps) {
  return (
    <View style={styles.container}>
      {/* Search Input Bar */}
      <View style={styles.searchBar}>
        <Search size={16} color="#667085" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search products, services or businesses..."
          placeholderTextColor="#667085"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <XCircle size={16} color="#667085" />
          </TouchableOpacity>
        )}
      </View>

      {/* City filter scroller */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cityScroll}
      >
        {CITIES.map((city) => {
          const isSelected = selectedCity === city;
          return (
            <TouchableOpacity
              key={city}
              onPress={() => setSelectedCity(city)}
              style={[
                styles.cityChip,
                isSelected ? styles.cityChipActive : styles.cityChipInactive,
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.cityChipText,
                  isSelected ? styles.cityChipTextActive : styles.cityChipTextInactive,
                ]}
              >
                {city}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Entity Tabs */}
      <View style={styles.tabsRow}>
        {(['all', 'products', 'services', 'businesses'] as const).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
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
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  cityScroll: {
    gap: 8,
    marginBottom: 12,
    paddingVertical: 2,
  },
  cityChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  cityChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  cityChipInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.border,
  },
  cityChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cityChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  cityChipTextInactive: {
    color: colors.textSecondary,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  tabButtonActive: {
    backgroundColor: '#EEF0FA',
    borderWidth: 1,
    borderColor: '#2E3192',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: '#2E3192',
    fontWeight: '700',
  },
});
