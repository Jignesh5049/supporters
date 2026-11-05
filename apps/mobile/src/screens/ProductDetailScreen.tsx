import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Bookmark, Share2 } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';
import {
  ProductImageGallery,
  ProductInfoCard,
  ProductSpecsTable,
  ProductSupplierCard,
  ProductRelatedList,
  ProductBottomBar,
} from '../features/catalog/components';
import type { Product } from '../../mock';

export function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const {
    products,
    businesses,
    savedProductIds,
    toggleSaveProduct,
    openConversationWithBusiness,
    openShareModal,
    routeParams,
    navigate,
    goBack,
  } = useApp();

  const productId = id || routeParams?.productId || 'p-1';
  const product = products.find((p) => p.id === productId) || products[0];
  const business = businesses.find((b) => b.id === product?.businessId) || businesses[0];

  const [selectedImgIdx, setSelectedImgIdx] = useState(0);
  const isSaved = savedProductIds.includes(product.id);

  const moreFromBusiness = products.filter(
    (p) => p.id !== product.id && p.businessId === product.businessId,
  );

  const handleContactSupplier = (targetProduct: Product = product) => {
    openConversationWithBusiness(targetProduct.businessId, {
      initialMessage: `Namaste! I am interested in "${targetProduct.title}" (₹${targetProduct.price.toLocaleString('en-IN')}). Please share wholesale pricing and delivery schedule.`,
      attachedProduct: {
        id: targetProduct.id,
        title: targetProduct.title,
        price: targetProduct.price,
        image: targetProduct.images[0],
      },
    });
  };

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={goBack}
          style={styles.backBtn}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Product Details
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => toggleSaveProduct(product.id)}
            style={styles.headerIconBtn}
            activeOpacity={0.7}
            accessibilityLabel="Save product"
          >
            <Bookmark
              size={20}
              color={isSaved ? colors.primary : colors.textPrimary}
              fill={isSaved ? colors.primary : 'transparent'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              openShareModal({
                title: product.title,
                url: `https://supporters.in/product/${product.id}`,
              })
            }
            style={styles.headerIconBtn}
            activeOpacity={0.7}
            accessibilityLabel="Share product"
          >
            <Share2 size={19} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <ProductImageGallery
          images={product.images}
          selectedIdx={selectedImgIdx}
          onSelectIdx={setSelectedImgIdx}
          availability={product.availability}
        />

        <ProductInfoCard product={product} />

        <ProductSpecsTable specifications={product.specifications} />

        <ProductSupplierCard
          business={business}
          onVisitStorefront={() => navigate('business_detail', { businessId: business.id })}
        />

        <ProductRelatedList
          products={moreFromBusiness}
          onViewProduct={(id) => navigate('product_detail', { productId: id })}
          onContactSupplier={handleContactSupplier}
        />
      </ScrollView>

      <ProductBottomBar
        phone={business.phone}
        onContactSupplier={() => handleContactSupplier(product)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerBar: {
    height: 54,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 24,
  },
});
