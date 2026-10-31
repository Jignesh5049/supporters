import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Package, Trash2, Eye, EyeOff } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { Product } from '../../mock';
import { colors } from '../styles/theme';
import { AddProductModal } from '../features/hub/components/AddProductModal';

export function HubProductsScreen() {
  const router = useRouter();
  const { products, currentUser, showToast } = useApp();

  const myBusinessId = currentUser?.businessId || 'b-1';
  const [productList, setProductList] = useState<Product[]>(
    products.filter((p) => p.businessId === myBusinessId),
  );
  const [addModalOpen, setAddModalOpen] = useState(false);

  const handleAddProduct = (data: {
    title: string;
    price: string;
    unit: string;
    minOrder: string;
    category: string;
    description: string;
  }) => {
    const newProd: Product = {
      id: `p-${Date.now()}`,
      businessId: myBusinessId,
      businessName: currentUser.name || 'My Business',
      businessCity: currentUser.city || 'Ahmedabad',
      businessVerified: true,
      businessAvatar:
        currentUser.avatar ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      title: data.title,
      slug: data.title.toLowerCase().replace(/\s+/g, '-'),
      category: data.category,
      price: parseFloat(data.price) || 0,
      unit: data.unit,
      minOrderQuantity: parseInt(data.minOrder, 10) || 1,
      images: [
        'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop&q=80',
      ],
      description: data.description || 'High quality manufactured item.',
      specifications: { Quality: 'Grade A', Origin: 'India' },
      availability: 'In Stock',
      deliveryTime: '2-4 business days',
      shippingAreas: ['Pan India'],
      rating: 5.0,
      reviewCount: 0,
    };

    setProductList((prev) => [newProd, ...prev]);
    showToast('Product added to your catalog!', 'success');
  };

  const handleDeleteProduct = (id: string) => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to remove this product from your catalog?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setProductList((prev) => prev.filter((p) => p.id !== id));
            showToast('Product deleted', 'info');
          },
        },
      ],
    );
  };

  const handleToggleStock = (id: string) => {
    setProductList((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              availability: p.availability === 'In Stock' ? 'Made to Order' : 'In Stock',
            }
          : p,
      ),
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Products ({productList.length})</Text>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={() => setAddModalOpen(true)}>
          <Plus size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.addButtonText}>Add Product</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtext}>
          Manage wholesale products visible on your Supporters business storefront.
        </Text>

        {productList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Package size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No products listed yet</Text>
            <Text style={styles.emptySubtitle}>
              Upload your catalog items to start receiving buyer RFQs and direct enquiries.
            </Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setAddModalOpen(true)}>
              <Text style={styles.emptyAddBtnText}>Add Your First Product</Text>
            </TouchableOpacity>
          </View>
        ) : (
          productList.map((p) => {
            const inStock = p.availability === 'In Stock';
            return (
              <View key={p.id} style={styles.productCard}>
                <Image source={{ uri: p.images[0] }} style={styles.productImage} />
                <View style={styles.productDetails}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{p.category}</Text>
                  </View>
                  <Text style={styles.productTitle} numberOfLines={1}>
                    {p.title}
                  </Text>
                  <Text style={styles.productPrice}>
                    ₹{p.price.toLocaleString('en-IN')} / {p.unit}
                  </Text>
                  <Text style={styles.productMoq}>Min Order: {p.minOrderQuantity} units</Text>

                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.stockToggle, inStock ? styles.stockIn : styles.stockOut]}
                      onPress={() => handleToggleStock(p.id)}
                    >
                      {inStock ? (
                        <Eye size={12} color="#16A34A" />
                      ) : (
                        <EyeOff size={12} color="#DC2626" />
                      )}
                      <Text
                        style={[styles.stockToggleText, { color: inStock ? '#16A34A' : '#DC2626' }]}
                      >
                        {inStock ? 'In Stock' : 'Made to Order'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteProduct(p.id)}
                    >
                      <Trash2 size={15} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <AddProductModal
        visible={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSubmit={handleAddProduct}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 6,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
  },
  subtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  emptyAddBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  productDetails: {
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  productMoq: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stockToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  stockIn: {
    backgroundColor: '#ECFDF5',
  },
  stockOut: {
    backgroundColor: '#FEF2F2',
  },
  stockToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  deleteBtn: {
    padding: 6,
  },
});
