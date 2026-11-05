import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import {
  Layers,
  Tv,
  Tag,
  Coffee,
  Home,
  Truck,
  Sun,
  Wrench,
  Star,
  Cpu,
  type LucideIcon,
} from 'lucide-react-native';
import { CATEGORIES } from '../../mock';
import { colors } from '../styles/theme';

interface CategoryScrollerProps {
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
}

const ICON_MAP: Record<string, LucideIcon> = {
  layers: Layers,
  tv: Tv,
  tag: Tag,
  coffee: Coffee,
  home: Home,
  truck: Truck,
  sun: Sun,
  tool: Wrench,
  star: Star,
  cpu: Cpu,
};

export function CategoryScroller({ selectedCategory, onSelectCategory }: CategoryScrollerProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const IconComponent = ICON_MAP[cat.iconName] || Layers;

          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => onSelectCategory(cat.id)}
              style={[
                styles.categoryPill,
                isSelected ? styles.categoryPillActive : styles.categoryPillInactive,
              ]}
              activeOpacity={0.75}
            >
              <IconComponent size={13} color={isSelected ? '#FFFFFF' : '#667085'} />
              <Text
                style={[
                  styles.categoryText,
                  isSelected ? styles.categoryTextActive : styles.categoryTextInactive,
                ]}
              >
                {cat.name}
              </Text>
              {cat.trending && !isSelected && <View style={styles.trendingDot} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    marginBottom: 12,
  },
  scrollContent: {
    paddingHorizontal: 10,
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    gap: 6,
  },
  categoryPillActive: {
    backgroundColor: colors.primary,
  },
  categoryPillInactive: {
    backgroundColor: colors.background,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  categoryTextInactive: {
    color: '#667085',
  },
  trendingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.accentMagenta,
  },
});
