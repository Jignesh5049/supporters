import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Bookmark, MessageSquare } from 'lucide-react-native';
import { colors } from '../../../styles/theme';
import type { Product } from '../../../../mock';

interface DiscoverProductCardProps {
  product: Product;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  onViewDetails: (id: string) => void;
  onContactSupplier: (product: Product) => void;
}

export function DiscoverProductCard({
  product,
  isSaved,
  onToggleSave,
  onViewDetails,
  onContactSupplier,
}: DiscoverProductCardProps) {
  return (
    <View style={styles.card}>
      <Image
        source={{ uri: product.images[0] }}
        style={styles.image}
        contentFit="cover"
        transition={200}
      />
      <View style={styles.details}>
        <View style={styles.topRow}>
          <Text style={styles.categoryBadge}>{product.category}</Text>
          <TouchableOpacity
            onPress={() => onToggleSave(product.id)}
            style={[styles.savePillBtn, isSaved && styles.savePillBtnActive]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Bookmark
              size={13}
              color={isSaved ? colors.primary : '#667085'}
              fill={isSaved ? colors.primary : 'transparent'}
            />
            <Text style={[styles.savePillText, isSaved && styles.savePillTextActive]}>
              {isSaved ? 'Saved' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {product.title}
        </Text>
        <Text style={styles.subtitle}>
          {product.businessName} · {product.businessCity}
        </Text>

        <View style={styles.pricingRow}>
          <Text style={styles.priceHighlight}>₹{product.price.toLocaleString('en-IN')}</Text>
          <Text style={styles.moqBadge}>
            MOQ: {product.minOrderQuantity} {product.unit}
          </Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => onViewDetails(product.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.detailsButtonText}>View Product</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.enquireButton}
            onPress={() => onContactSupplier(product)}
            activeOpacity={0.85}
          >
            <MessageSquare size={13} color="#FFFFFF" />
            <Text style={styles.enquireButtonText}>Contact</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  image: {
    width: 120,
    height: 140,
    backgroundColor: '#F3F4F6',
  },
  details: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2E3192',
    backgroundColor: '#EEF0FA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  savePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  savePillBtnActive: {
    backgroundColor: '#EEF0FA',
  },
  savePillText: {
    fontSize: 11,
    color: '#667085',
    fontWeight: '500',
  },
  savePillTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  priceHighlight: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
  },
  moqBadge: {
    fontSize: 10,
    color: colors.textSecondary,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  detailsButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  detailsButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  enquireButton: {
    flex: 1.2,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  enquireButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

