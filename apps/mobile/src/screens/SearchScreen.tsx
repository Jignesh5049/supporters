import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Search as SearchIcon,
  X,
  Package,
  Wrench,
  Building2,
} from 'lucide-react-native';
import { EmptyState, ProductCard, BusinessCard } from '@supporters/ui-native/patterns';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';

export function SearchScreen() {
  const router = useRouter();
  const { products, services, businesses, openEnquiryModal } = useApp();

  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'products' | 'services' | 'businesses'>('all');
  const [selectedCity, setSelectedCity] = useState<string>('All');

  const cities = ['All', 'Ahmedabad', 'Surat', 'Mumbai', 'Bengaluru', 'Pune'];

  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return { products: [], services: [], businesses: [] };
    }

    const matchesCity = (city: string) =>
      selectedCity === 'All' || city.toLowerCase() === selectedCity.toLowerCase();

    const matchedProducts = products.filter(
      (p) =>
        (p.title.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.businessName.toLowerCase().includes(q)) &&
        matchesCity(p.businessCity),
    );

    const matchedServices = services.filter(
      (s) =>
        (s.title.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          s.businessName.toLowerCase().includes(q)) &&
        matchesCity(s.businessCity),
    );

    const matchedBusinesses = businesses.filter(
      (b) =>
        (b.name.toLowerCase().includes(q) ||
          b.businessType.toLowerCase().includes(q) ||
          b.category.toLowerCase().includes(q)) &&
        matchesCity(b.city),
    );

    return {
      products: matchedProducts,
      services: matchedServices,
      businesses: matchedBusinesses,
    };
  }, [query, selectedCity, products, services, businesses]);

  const totalResults =
    filteredResults.products.length +
    filteredResults.services.length +
    filteredResults.businesses.length;

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.searchBar}>
          <SearchIcon size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products, suppliers, cities..."
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
              <X size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* City Filters */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {cities.map((city) => (
            <TouchableOpacity
              key={city}
              style={[styles.cityPill, selectedCity === city && styles.cityPillActive]}
              onPress={() => setSelectedCity(city)}
            >
              <Text
                style={[styles.cityPillText, selectedCity === city && styles.cityPillTextActive]}
              >
                {city}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {(['all', 'products', 'services', 'businesses'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results Content */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!query.trim() ? (
          <EmptyState
            icon={<SearchIcon size={36} color="#9CA3AF" />}
            title="Search Verified Trade Directory"
            description="Find B2B manufacturers, textile mills, engineering suppliers, and direct RFQs across India."
            className="my-10"
          />
        ) : totalResults === 0 ? (
          <EmptyState
            icon={<X size={36} color="#9CA3AF" />}
            title="No Results Matching"
            description={`We couldn't find any listings for "${query}" in ${selectedCity}. Try searching with broader keywords.`}
            actionLabel="Reset Search"
            onAction={() => {
              setQuery('');
              setSelectedCity('All');
            }}
            className="my-10"
          />
        ) : (
          <View style={styles.resultsGrid}>
            {/* Products Section */}
            {(activeTab === 'all' || activeTab === 'products') &&
              filteredResults.products.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <Package size={16} color={colors.primary} />
                    <Text style={styles.sectionTitle}>
                      Products ({filteredResults.products.length})
                    </Text>
                  </View>
                  <View style={styles.cardsGrid}>
                    {filteredResults.products.map((p) => (
                      <ProductCard
                        key={p.id}
                        product={{
                          id: p.id,
                          title: p.title,
                          price: p.price,
                          moq: p.minOrderQuantity,
                          unit: p.unit,
                          imageUrl: p.images[0],
                          businessName: p.businessName,
                        }}
                        onPress={() => router.push(`/product/${p.id}` as any)}
                        onEnquiry={() =>
                          openEnquiryModal({
                            title: p.title,
                            businessName: p.businessName,
                            businessId: p.businessId,
                          })
                        }
                        className="mb-3"
                      />
                    ))}
                  </View>
                </View>
              )}

            {/* Businesses Section */}
            {(activeTab === 'all' || activeTab === 'businesses') &&
              filteredResults.businesses.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <Building2 size={16} color={colors.primary} />
                    <Text style={styles.sectionTitle}>
                      Suppliers ({filteredResults.businesses.length})
                    </Text>
                  </View>
                  {filteredResults.businesses.map((b) => (
                    <BusinessCard
                      key={b.id}
                      business={{
                        id: b.id,
                        name: b.name,
                        category: b.category,
                        city: b.city,
                        isVerified: b.verified,
                        rating: b.rating,
                        logoUrl: b.avatar,
                      }}
                      onPress={() => router.push(`/business/${b.id}` as any)}
                      className="mb-3"
                    />
                  ))}
                </View>
              )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 6,
    marginRight: 6,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 2,
  },
  clearBtn: {
    padding: 4,
  },
  filterBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cityPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  cityPillActive: {
    backgroundColor: colors.primary,
  },
  cityPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  cityPillTextActive: {
    color: '#FFFFFF',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  tabTextActive: {
    color: colors.primary,
  },
  content: {
    padding: 14,
    paddingBottom: 40,
  },
  resultsGrid: {
    gap: 16,
  },
  section: {
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardsGrid: {
    gap: 10,
  },
});
