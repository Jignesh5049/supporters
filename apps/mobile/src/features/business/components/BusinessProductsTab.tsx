import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Bookmark, Send, Package } from 'lucide-react-native';
import { Product } from '../../../mock';
import { colors, spacing, borderRadius } from '../../../styles/theme';

interface BusinessProductsTabProps {
  products: Product[];
  savedProductIds: string[];
  onToggleSave: (id: string) => void;
  onOpenProduct: (id: string) => void;
  onOpenEnquiry: (product: Product) => void;
}

export function BusinessProductsTab({
  products,
  savedProductIds,
  onToggleSave,
  onOpenProduct,
  onOpenEnquiry,
}: BusinessProductsTabProps) {
  if (products.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Package size={40} color={colors.textMuted} style={{ marginBottom: 8 }} />
        <Text style={styles.emptyTitle}>No products listed yet</Text>
        <Text style={styles.emptyText}>
          This business hasn't published products to their catalog.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.listContainer}>
      {products.map((item) => {
        const isSaved = savedProductIds.includes(item.id);
        return (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            onPress={() => onOpenProduct(item.id)}
            activeOpacity={0.85}
          >
            <Image
              source={{ uri: item.images[0] }}
              style={styles.productImage}
              contentFit="cover"
              cachePolicy="disk"
            />

            <View style={styles.productContent}>
              <View style={styles.titleRow}>
                <Text style={styles.productTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <TouchableOpacity
                  onPress={() => onToggleSave(item.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Bookmark
                    size={18}
                    color={isSaved ? colors.primary : colors.textSecondary}
                    fill={isSaved ? colors.primary : 'none'}
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.priceText}>
                ₹{item.price.toLocaleString('en-IN')}{' '}
                <Text style={styles.unitText}>/ {item.unit}</Text>
              </Text>

              <Text style={styles.moqText}>
                MOQ: {item.minOrderQuantity} {item.unit}
              </Text>

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.enquireButton} onPress={() => onOpenEnquiry(item)}>
                  <Send size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.enquireButtonText}>Send Enquiry</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    padding: spacing.md,
    gap: spacing.md,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  productImage: {
    width: 90,
    height: 90,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.gray100,
  },
  productContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 6,
    lineHeight: 18,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 2,
  },
  unitText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  moqText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  actionRow: {
    marginTop: 6,
  },
  enquireButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  enquireButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
});
