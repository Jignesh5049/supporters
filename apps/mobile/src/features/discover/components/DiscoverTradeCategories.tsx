import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  Tv,
  Shirt,
  Apple,
  Tractor,
  Cpu,
  Wrench,
  Sparkles,
  Briefcase,
  ChevronRight,
} from 'lucide-react-native';
import { colors } from '../../../styles/theme';

export interface TradeCategoryItem {
  id: string;
  name: string;
  bgColor: string;
  iconColor: string;
  icon: React.ComponentType<{ size: number; color: string }>;
}

const TRADE_CATEGORIES: TradeCategoryItem[] = [
  { id: 'electronics', name: 'Electronics', bgColor: '#EEF0FA', iconColor: '#2E3192', icon: Tv },
  { id: 'fashion', name: 'Fashion', bgColor: '#FCE7F3', iconColor: '#A3238E', icon: Shirt },
  { id: 'food', name: 'Food...', bgColor: '#E0F2FE', iconColor: '#0284C7', icon: Apple },
  { id: 'agri', name: 'Agri Trade', bgColor: '#F3E8FF', iconColor: '#4338CA', icon: Tractor },
  { id: 'machinery', name: 'Machinery', bgColor: '#EDE9FE', iconColor: '#334155', icon: Cpu },
  { id: 'hardware', name: 'Hardware', bgColor: '#DBEAFE', iconColor: '#2E3192', icon: Wrench },
  { id: 'beauty', name: 'Beauty/Care', bgColor: '#FCE7F3', iconColor: '#A3238E', icon: Sparkles },
  { id: 'services', name: 'Services', bgColor: '#E0F2FE', iconColor: '#0284C7', icon: Briefcase },
];

interface DiscoverTradeCategoriesProps {
  onSelectCategory: (name: string) => void;
  onExploreAll: () => void;
}

export function DiscoverTradeCategories({
  onSelectCategory,
  onExploreAll,
}: DiscoverTradeCategoriesProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleLeft}>
          <View style={styles.verticalBarAccent} />
          <Text style={styles.title}>Trade Categories</Text>
        </View>
        <TouchableOpacity
          onPress={onExploreAll}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.exploreLinkRow}
        >
          <Text style={styles.exploreAllLink}>Explore 140+</Text>
          <ChevronRight size={14} color="#0D9488" />
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {TRADE_CATEGORIES.map((item) => {
          const Icon = item.icon;
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.tile}
              onPress={() => onSelectCategory(item.name.replace('...', ''))}
              activeOpacity={0.75}
            >
              <View style={[styles.iconSquircle, { backgroundColor: item.bgColor }]}>
                <Icon size={20} color={item.iconColor} />
              </View>
              <Text style={styles.label} numberOfLines={1}>
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verticalBarAccent: {
    width: 3,
    height: 14,
    backgroundColor: '#2E3192',
    borderRadius: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  exploreLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  exploreAllLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0D9488',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tile: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  iconSquircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
