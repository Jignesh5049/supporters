import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { MessageSquare } from 'lucide-react-native';
import { colors } from '../../../styles/theme';
import type { Product } from '../../../../mock';

interface ProductRelatedListProps {
  products: Product[];
  onViewProduct: (id: string) => void;
  onContactSupplier: (product: Product) => void;
}

export function ProductRelatedList({
  products,
  onViewProduct,
  onContactSupplier,
}: ProductRelatedListProps) {
  if (products.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>More from this Supplier</Text>
      {products.map((item) => (
        <View key={item.id} style={styles.card}>
          <Image
            source={{ uri: item.images[0] }}
            style={styles.img}
            contentFit="cover"
            transition={200}
          />
          <View style={styles.details}>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.price}>
              ₹{item.price.toLocaleString('en-IN')} (MOQ: {item.minOrderQuantity} {item.unit})
            </Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.viewBtn}
                onPress={() => onViewProduct(item.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.viewBtnText}>View Product</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.contactBtn}
                onPress={() => onContactSupplier(item)}
                activeOpacity={0.8}
              >
                <MessageSquare size={11} color="#FFFFFF" />
                <Text style={styles.contactBtnText}>Contact</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    gap: 12,
  },
  img: {
    width: 70,
    height: 70,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  details: {
    flex: 1,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  price: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  viewBtn: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  viewBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  contactBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

