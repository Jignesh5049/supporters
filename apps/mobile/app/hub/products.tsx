import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Package, Trash2, Eye, EyeOff, X } from 'lucide-react-native';
import { useApp } from '../../src/context/AppContext';
import { Product } from '../../mock';
import { colors, typography, spacing, borderRadius } from '../../src/styles/theme';

export default function HubProductsScreen() {
  const router = useRouter();
  const { products, currentUser, showToast } = useApp();

  const myBusinessId = currentUser?.businessId || 'b-1';
  const [productList, setProductList] = useState<Product[]>(
    products.filter((p) => p.businessId === myBusinessId),
  );

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Industrial Supplies');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('Piece');
  const [minOrder, setMinOrder] = useState('100');
  const [description, setDescription] = useState('');

  const handleAddProduct = () => {
    if (!title.trim() || !price.trim()) {
      showToast('Title and price are required', 'error');
      return;
    }

    const newProd: Product = {
      id: `p-${Date.now()}`,
      businessId: myBusinessId,
      businessName: currentUser.name || 'My Business',
      businessCity: currentUser.city || 'Ahmedabad',
      businessVerified: true,
      businessAvatar:
        currentUser.avatar ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      title: title.trim(),
      slug: title.trim().toLowerCase().replace(/\s+/g, '-'),
      category,
      price: parseFloat(price) || 0,
      unit,
      minOrderQuantity: parseInt(minOrder, 10) || 1,
      images: [
        'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop&q=80',
      ],
      description: description.trim() || 'High quality manufactured item.',
      specifications: { Quality: 'Grade A', Origin: 'India' },
      availability: 'In Stock',
      deliveryTime: '2-4 business days',
      shippingAreas: ['Pan India'],
      rating: 5.0,
      reviewCount: 0,
    };

    setProductList((prev) => [newProd, ...prev]);
    setAddModalOpen(false);
    setTitle('');
    setPrice('');
    setDescription('');
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
    showToast('Product stock status updated', 'success');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Products Catalog</Text>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={() => setAddModalOpen(true)}>
          <Plus size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.addButtonText}>Add Product</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtext}>
          Manage products displayed on your public business page and search listings (
          {productList.length})
        </Text>

        {productList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Package size={48} color={colors.gray300} style={{ marginBottom: spacing.md }} />
            <Text style={styles.emptyTitle}>No products added yet</Text>
            <Text style={styles.emptySub}>
              Showcase your manufactured items, machinery, and goods to prospective buyers.
            </Text>
          </View>
        ) : (
          productList.map((prod) => (
            <View key={prod.id} style={styles.card}>
              <Image source={{ uri: prod.images[0] }} style={styles.productImg} />
              <View style={styles.cardInfo}>
                <View style={styles.titleRow}>
                  <Text style={styles.productTitle} numberOfLines={2}>
                    {prod.title}
                  </Text>
                </View>

                <Text style={styles.priceText}>
                  ₹{prod.price.toLocaleString('en-IN')}{' '}
                  <Text style={styles.unitText}>/ {prod.unit}</Text>
                </Text>

                <View style={styles.stockBadge}>
                  <Text
                    style={[
                      styles.stockText,
                      prod.availability !== 'In Stock' && { color: colors.warning },
                    ]}
                  >
                    ● {prod.availability}
                  </Text>
                  <Text style={styles.moqText}>MOQ: {prod.minOrderQuantity}</Text>
                </View>

                {/* Actions */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleToggleStock(prod.id)}
                  >
                    {prod.availability === 'In Stock' ? (
                      <Eye size={16} color={colors.textSecondary} />
                    ) : (
                      <EyeOff size={16} color={colors.error} />
                    )}
                    <Text style={styles.actionBtnText}>
                      {prod.availability === 'In Stock' ? 'In Stock' : 'Pre-Order'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleDeleteProduct(prod.id)}
                  >
                    <Trash2 size={16} color={colors.error} />
                    <Text style={[styles.actionBtnText, { color: colors.error }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Product Modal */}
      <Modal visible={addModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Product</Text>
              <TouchableOpacity onPress={() => setAddModalOpen(false)}>
                <X size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Product Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Industrial Valve (Forged Steel)"
                  placeholderTextColor={colors.gray400}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
                  <Text style={styles.label}>Price (INR) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 1500"
                    placeholderTextColor={colors.gray400}
                    keyboardType="numeric"
                    value={price}
                    onChangeText={setPrice}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: spacing.sm }]}>
                  <Text style={styles.label}>Unit</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Piece / Box / Kg / Meter"
                    placeholderTextColor={colors.gray400}
                    value={unit}
                    onChangeText={setUnit}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
                  <Text style={styles.label}>Min Order Qty (MOQ)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 50"
                    placeholderTextColor={colors.gray400}
                    keyboardType="numeric"
                    value={minOrder}
                    onChangeText={setMinOrder}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: spacing.sm }]}>
                  <Text style={styles.label}>Category</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Category"
                    placeholderTextColor={colors.gray400}
                    value={category}
                    onChangeText={setCategory}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Product Description</Text>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="Describe material grade, application, warranty..."
                  placeholderTextColor={colors.gray400}
                  multiline
                  numberOfLines={3}
                  value={description}
                  onChangeText={setDescription}
                />
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleAddProduct}>
                <Text style={styles.submitBtnText}>Save & Publish</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerTitle: {
    ...typography.subtitle1,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    height: 38,
    borderRadius: borderRadius.full,
  },
  addButtonText: {
    ...typography.caption,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 60,
  },
  subtext: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.subtitle1,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptySub: {
    ...typography.body2,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  productImg: {
    width: 90,
    height: 90,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
    backgroundColor: colors.gray100,
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productTitle: {
    ...typography.subtitle2,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 2,
  },
  unitText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  stockText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
  moqText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    paddingTop: 6,
    marginTop: 6,
    gap: spacing.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  input: {
    height: 46,
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray300,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    color: colors.textPrimary,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
