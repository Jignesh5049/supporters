import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';
import {
  DiscoverHeader,
  DiscoverTradeCategories,
  DiscoverProductCard,
  DiscoverServiceCard,
  DiscoverBusinessCard,
  type DiscoverTab,
} from '../features/discover/components';

export function DiscoverScreen() {
  const {
    products,
    services,
    businesses,
    savedProductIds,
    toggleSaveProduct,
    savedServiceIds,
    toggleSaveService,
    savedBusinessIds,
    toggleSaveBusiness,
    followedBusinessIds,
    toggleFollowBusiness,
    openEnquiryModal,
    openConversationWithBusiness,
    navigate,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [activeTab, setActiveTab] = useState<DiscoverTab>('all');

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = selectedCity === 'All Cities' || p.businessCity === selectedCity;
    return matchesSearch && matchesCity;
  });

  // Filter services
  const filteredServices = services.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = selectedCity === 'All Cities' || s.businessCity === selectedCity;
    return matchesSearch && matchesCity;
  });

  // Filter businesses
  const filteredBusinesses = businesses.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCity = selectedCity === 'All Cities' || b.city === selectedCity;
    return matchesSearch && matchesCity;
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <DiscoverHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCity={selectedCity}
        setSelectedCity={setSelectedCity}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <DiscoverTradeCategories
        onSelectCategory={(term) => setSearchQuery(term)}
        onExploreAll={() => {
          setSearchQuery('');
          setSelectedCity('All Cities');
        }}
      />

      {/* Products Section */}
      {(activeTab === 'all' || activeTab === 'products') && (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Featured Products ({filteredProducts.length})</Text>
          {filteredProducts.map((p) => (
            <DiscoverProductCard
              key={p.id}
              product={p}
              isSaved={savedProductIds.includes(p.id)}
              onToggleSave={toggleSaveProduct}
              onViewDetails={(id) => navigate('product_detail', { productId: id })}
              onContactSupplier={(prod) =>
                openConversationWithBusiness(prod.businessId, {
                  initialMessage: `Namaste! I am interested in "${prod.title}" (₹${prod.price.toLocaleString('en-IN')}). Please share wholesale pricing and delivery schedule.`,
                  attachedProduct: prod,
                })
              }
            />
          ))}
        </View>
      )}

      {/* Services Section */}
      {(activeTab === 'all' || activeTab === 'services') && (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Verified Services ({filteredServices.length})</Text>
          {filteredServices.map((s) => (
            <DiscoverServiceCard
              key={s.id}
              service={s}
              isSaved={savedServiceIds.includes(s.id)}
              onToggleSave={toggleSaveService}
              onRequestConsultation={(srv) =>
                openEnquiryModal({
                  title: srv.title,
                  businessName: srv.businessName,
                  businessId: srv.businessId,
                })
              }
            />
          ))}
        </View>
      )}

      {/* Businesses Section */}
      {(activeTab === 'all' || activeTab === 'businesses') && (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>
            Verified Manufacturers & Suppliers ({filteredBusinesses.length})
          </Text>
          {filteredBusinesses.map((b) => (
            <DiscoverBusinessCard
              key={b.id}
              business={b}
              isFollowing={followedBusinessIds.includes(b.id)}
              isSaved={savedBusinessIds.includes(b.id)}
              onToggleFollow={toggleFollowBusiness}
              onToggleSave={toggleSaveBusiness}
              onViewCatalog={(id) => navigate('business_detail', { businessId: id })}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: 12,
    paddingBottom: 24,
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
  },
});
