import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Star, Truck } from 'lucide-react-native';
import { colors } from '../../../styles/theme';
import type { Product } from '../../../../mock';

interface ProductInfoCardProps {
  product: Product;
}

export function ProductInfoCard({ product }: ProductInfoCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.categoryRatingRow}>
        <View style={styles.categoryTag}>
          <Text style={styles.categoryTagText}>{product.category}</Text>
        </View>
        <View style={styles.ratingBadge}>
          <Star size={13} color="#F59E0B" fill="#F59E0B" />
          <Text style={styles.ratingText}>
            {product.rating} ({product.reviewCount} reviews)
          </Text>
        </View>
      </View>

      <Text style={styles.titleText}>{product.title}</Text>

      {/* Pricing & MOQ Container */}
      <View style={styles.pricingCard}>
        <View style={styles.priceRow}>
          <Text style={styles.currentPrice}>₹{product.price.toLocaleString('en-IN')}</Text>
          {product.originalPrice && (
            <Text style={styles.originalPrice}>
              ₹{product.originalPrice.toLocaleString('en-IN')}
            </Text>
          )}
          <Text style={styles.unitText}>/ {product.unit}</Text>
        </View>

        <View style={styles.moqDeliveryRow}>
          <View style={styles.specCol}>
            <Text style={styles.specLabel}>Minimum Order:</Text>
            <Text style={styles.specValue}>
              {product.minOrderQuantity} {product.unit}
            </Text>
          </View>
          <View style={styles.specCol}>
            <Text style={styles.specLabel}>Est. Dispatch:</Text>
            <Text style={styles.specValue}>{product.deliveryTime}</Text>
          </View>
        </View>
      </View>

      {/* Overview Description */}
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionHeading}>Product Overview</Text>
        <Text style={styles.descriptionText}>{product.description}</Text>
      </View>

      {/* Shipping & Delivery Area */}
      <View style={styles.shippingNotice}>
        <Truck size={18} color={colors.primary} />
        <View style={styles.shippingTextCol}>
          <Text style={styles.shippingTitle}>Shipping & Supply Coverage</Text>
          <Text style={styles.shippingDesc}>{product.shippingAreas.join(', ')}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  categoryRatingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryTag: {
    backgroundColor: '#EEF0FA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryTagText: {
    color: '#2E3192',
    fontSize: 11,
    fontWeight: '700',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 24,
    marginBottom: 12,
  },
  pricingCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 8,
  },
  currentPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: '#065F46',
  },
  originalPrice: {
    fontSize: 14,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  unitText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  moqDeliveryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  specCol: {
    flex: 1,
  },
  specLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  specValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sectionBlock: {
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  descriptionText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  },
  shippingNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  shippingTextCol: {
    flex: 1,
  },
  shippingTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 2,
  },
  shippingDesc: {
    fontSize: 11,
    color: '#15803D',
  },
});

