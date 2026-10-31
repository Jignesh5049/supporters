import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  Dimensions,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { parseRouteId } from '../../lib/navigation/params';
import { colors } from '../../styles/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function ProductDetailScreen() {
  const {
    products,
    businesses,
    savedProductIds,
    toggleSaveProduct,
    openConversationWithBusiness,
    openShareModal,
    navigate,
    goBack,
  } = useApp();

  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = parseRouteId(id) ?? 'p-1';
  const product = products.find((p) => p.id === productId) || products[0];
  const business = businesses.find((b) => b.id === product?.businessId) || businesses[0];

  const [selectedImgIdx, setSelectedImgIdx] = useState(0);
  const isSaved = savedProductIds.includes(product.id);

  const moreFromBusiness = products.filter(
    (p) => p.id !== product.id && p.businessId === product.businessId,
  );

  const handleContactSupplier = (targetProduct = product) => {
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
        <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Product Details
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => toggleSaveProduct(product.id)}
            style={styles.headerIconBtn}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={isSaved ? colors.primary : colors.textPrimary}
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
          >
            <Feather name="share-2" size={19} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Main Product Image Carousel */}
        <View style={styles.imageGalleryContainer}>
          <Image
            source={{ uri: product.images[selectedImgIdx] || product.images[0] }}
            style={styles.mainImage}
            resizeMode="cover"
          />
          <View style={styles.availabilityBadge}>
            <Text style={styles.availabilityText}>{product.availability}</Text>
          </View>
        </View>

        {/* Thumbnail Selector */}
        {product.images.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbScroll}
          >
            {product.images.map((img, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => setSelectedImgIdx(idx)}
                style={[styles.thumbWrapper, selectedImgIdx === idx && styles.thumbWrapperActive]}
                activeOpacity={0.8}
              >
                <Image source={{ uri: img }} style={styles.thumbImg} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Title & Category Info */}
        <View style={styles.infoCard}>
          <View style={styles.categoryRatingRow}>
            <View style={styles.categoryTag}>
              <Text style={styles.categoryTagText}>{product.category}</Text>
            </View>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={13} color="#F59E0B" />
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
            <MaterialCommunityIcons
              name="truck-delivery-outline"
              size={18}
              color={colors.primary}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.shippingTitle}>Shipping & Supply Coverage</Text>
              <Text style={styles.shippingDesc}>{product.shippingAreas.join(', ')}</Text>
            </View>
          </View>
        </View>

        {/* Technical & Commercial Specifications Section */}
        {product.specifications && Object.keys(product.specifications).length > 0 && (
          <View style={styles.specsCard}>
            <View style={styles.specsHeader}>
              <MaterialCommunityIcons name="layers-outline" size={18} color={colors.primary} />
              <Text style={styles.specsTitle}>Technical & Commercial Specifications</Text>
            </View>

            <View style={styles.specsList}>
              {Object.entries(product.specifications).map(([key, val], idx, arr) => (
                <View
                  key={key}
                  style={[styles.specRow, idx === arr.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <Text style={styles.specItemLabel}>{key}</Text>
                  <Text style={styles.specItemValue}>{val}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Supplier Profile Card */}
        <View style={styles.supplierCard}>
          <Text style={styles.supplierCardHeader}>Verified Supplier</Text>
          <View style={styles.supplierRow}>
            <Image source={{ uri: business.avatar }} style={styles.supplierAvatar} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.supplierName} numberOfLines={1}>
                  {business.name}
                </Text>
                {business.verified && (
                  <Ionicons name="checkmark-circle" size={14} color={colors.accentCyan} />
                )}
              </View>
              <Text style={styles.supplierSubtitle}>
                {business.category} · {business.city}, {business.state}
              </Text>
              <Text style={styles.supplierResponse}>⚡ Responds in {business.responseRate}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.viewStorefrontBtn}
            onPress={() => navigate('business_detail', { businessId: business.id })}
            activeOpacity={0.8}
          >
            <Feather name="external-link" size={14} color={colors.primary} />
            <Text style={styles.viewStorefrontText}>Visit Business Storefront</Text>
          </TouchableOpacity>
        </View>

        {/* More Products from Supplier */}
        {moreFromBusiness.length > 0 && (
          <View style={styles.moreSection}>
            <Text style={styles.moreSectionTitle}>More from this Supplier</Text>
            {moreFromBusiness.map((item) => (
              <View key={item.id} style={styles.relatedProductCard}>
                <Image source={{ uri: item.images[0] }} style={styles.relatedImg} />
                <View style={styles.relatedDetails}>
                  <Text style={styles.relatedTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.relatedPrice}>
                    ₹{item.price.toLocaleString('en-IN')} (MOQ: {item.minOrderQuantity} {item.unit})
                  </Text>
                  {/* Both 2 buttons: View Product & Contact Supplier */}
                  <View style={styles.relatedActionsRow}>
                    <TouchableOpacity
                      style={styles.relatedViewBtn}
                      onPress={() => navigate('product_detail', { productId: item.id })}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.relatedViewBtnText}>View Product</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.relatedContactBtn}
                      onPress={() => handleContactSupplier(item)}
                      activeOpacity={0.8}
                    >
                      <Feather name="message-square" size={11} color="#FFFFFF" />
                      <Text style={styles.relatedContactBtnText}>Contact Supplier</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Fixed Bottom Action Bar */}
      <View style={styles.bottomBar}>
        {business.phone ? (
          <TouchableOpacity
            style={styles.callButton}
            onPress={() => Linking.openURL(`tel:${business.phone}`)}
            activeOpacity={0.8}
          >
            <Ionicons name="call-outline" size={18} color="#0D9488" />
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={styles.contactMainBtn}
          onPress={() => handleContactSupplier(product)}
          activeOpacity={0.85}
        >
          <Feather name="message-square" size={16} color="#FFFFFF" />
          <Text style={styles.contactMainText}>Contact Supplier</Text>
        </TouchableOpacity>
      </View>
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
    color: '#0F172A',
    marginLeft: 6,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
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
    paddingBottom: 90,
  },
  imageGalleryContainer: {
    position: 'relative',
    width: '100%',
    height: SCREEN_WIDTH * 0.72,
    backgroundColor: '#0F172A',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  availabilityBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  availabilityText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  thumbScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  thumbWrapper: {
    width: 60,
    height: 60,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  thumbWrapperActive: {
    borderColor: colors.primary,
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  categoryRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryTag: {
    backgroundColor: 'rgba(0,174,239,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryTagText: {
    color: colors.accentCyan,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  titleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 24,
    marginBottom: 14,
  },
  pricingCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 10,
  },
  currentPrice: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.primary,
  },
  originalPrice: {
    fontSize: 13,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  unitText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  moqDeliveryRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
  },
  specCol: {
    flex: 1,
  },
  specLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  specValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionBlock: {
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    gap: 10,
    backgroundColor: 'rgba(46,49,146,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(46,49,146,0.15)',
    borderRadius: 12,
    padding: 12,
  },
  shippingTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
  },
  shippingDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  specsCard: {
    backgroundColor: '#FFFFFF',
    marginTop: 10,
    padding: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  specsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  specsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  specsList: {
    marginTop: 6,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    gap: 16,
  },
  specItemLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
  },
  specItemValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
    flex: 1.2,
    textAlign: 'right',
  },
  supplierCard: {
    backgroundColor: '#FFFFFF',
    marginTop: 10,
    padding: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  supplierCardHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  supplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  supplierAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  supplierName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  supplierSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  supplierResponse: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
    marginTop: 3,
  },
  viewStorefrontBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(46,49,146,0.06)',
    paddingVertical: 10,
    borderRadius: 10,
  },
  viewStorefrontText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  moreSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 10,
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
  },
  moreSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  relatedProductCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    gap: 10,
  },
  relatedImg: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  relatedDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  relatedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  relatedPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 2,
  },
  relatedActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  relatedViewBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
  },
  relatedViewBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  relatedContactBtn: {
    flex: 1.2,
    backgroundColor: colors.primary,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  relatedContactBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
  },
  callButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#99F6E4',
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactMainBtn: {
    flex: 1,
    height: 46,
    backgroundColor: colors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  contactMainText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
