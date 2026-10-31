import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Search as SearchIcon,
  X,
  Building2,
  Package,
  Wrench,
  ShieldCheck,
  MapPin,
} from 'lucide-react-native';
import { useApp } from '../src/context/AppContext';
import { colors, typography, spacing, borderRadius } from '../src/styles/theme';

export default function SearchScreen() {
  const router = useRouter();
  const { products, services, businesses } = useApp();

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
          b.category.toLowerCase().includes(q) ||
          (b.about && b.about.toLowerCase().includes(q))) &&
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
      {/* Top Search Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.searchField}>
          <SearchIcon size={18} color={colors.gray400} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.input}
            placeholder="Search products, services, businesses..."
            placeholderTextColor={colors.gray400}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearButton}>
              <X size={16} color={colors.gray500} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* City Filter Chips */}
      <View style={styles.cityFilterRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cityChips}
        >
          {cities.map((city) => {
            const isSelected = selectedCity === city;
            return (
              <TouchableOpacity
                key={city}
                style={[styles.cityChip, isSelected && styles.cityChipActive]}
                onPress={() => setSelectedCity(city)}
              >
                <Text style={[styles.cityChipText, isSelected && styles.cityChipTextActive]}>
                  {city}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {(['all', 'products', 'services', 'businesses'] as const).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.resultsContent}
        showsVerticalScrollIndicator={false}
      >
        {query.trim().length === 0 ? (
          <View style={styles.emptyState}>
            <SearchIcon size={44} color={colors.gray300} style={{ marginBottom: spacing.md }} />
            <Text style={styles.emptyTitle}>Search verified local suppliers</Text>
            <Text style={styles.emptySubtitle}>
              Try searching "CNC machining", "Textile yarn", "Packaging box", or "Warehouse"
            </Text>
          </View>
        ) : totalResults === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No results found for "{query}"</Text>
            <Text style={styles.emptySubtitle}>
              Try checking your spelling or searching for a broader term or different city
            </Text>
          </View>
        ) : (
          <View>
            {/* Businesses Results */}
            {(activeTab === 'all' || activeTab === 'businesses') &&
              filteredResults.businesses.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Building2 size={16} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.sectionTitle}>
                      Businesses ({filteredResults.businesses.length})
                    </Text>
                  </View>
                  {filteredResults.businesses.map((b) => (
                    <TouchableOpacity
                      key={b.id}
                      style={styles.businessCard}
                      onPress={() => router.push(`/business/${b.id}` as any)}
                    >
                      <Image source={{ uri: b.avatar }} style={styles.businessAvatar} />
                      <View style={styles.businessInfo}>
                        <View style={styles.nameRow}>
                          <Text style={styles.businessName}>{b.name}</Text>
                          {b.verified && (
                            <ShieldCheck
                              size={14}
                              color={colors.primary}
                              style={{ marginLeft: 4 }}
                            />
                          )}
                        </View>
                        <Text style={styles.businessCategory}>{b.category}</Text>
                        <View style={styles.locationRow}>
                          <MapPin
                            size={12}
                            color={colors.textSecondary}
                            style={{ marginRight: 3 }}
                          />
                          <Text style={styles.locationText}>{b.city}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

            {/* Products Results */}
            {(activeTab === 'all' || activeTab === 'products') &&
              filteredResults.products.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Package size={16} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.sectionTitle}>
                      Products ({filteredResults.products.length})
                    </Text>
                  </View>
                  {filteredResults.products.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={styles.itemCard}
                      onPress={() => router.push(`/product/${p.id}` as any)}
                    >
                      <Image source={{ uri: p.images[0] }} style={styles.itemImage} />
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemTitle} numberOfLines={2}>
                          {p.title}
                        </Text>
                        <Text style={styles.itemPrice}>
                          ₹{p.price.toLocaleString('en-IN')}{' '}
                          <Text style={styles.itemUnit}>/ {p.unit}</Text>
                        </Text>
                        <Text style={styles.supplierSubText}>
                          {p.businessName} • {p.businessCity}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

            {/* Services Results */}
            {(activeTab === 'all' || activeTab === 'services') &&
              filteredResults.services.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Wrench size={16} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.sectionTitle}>
                      Services ({filteredResults.services.length})
                    </Text>
                  </View>
                  {filteredResults.services.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      style={styles.itemCard}
                      onPress={() => router.push(`/service/${s.id}` as any)}
                    >
                      <Image source={{ uri: s.images[0] }} style={styles.itemImage} />
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemTitle} numberOfLines={2}>
                          {s.title}
                        </Text>
                        <Text style={styles.itemPrice}>
                          ₹{s.startingPrice.toLocaleString('en-IN')}{' '}
                          <Text style={styles.itemUnit}>{s.priceUnit}</Text>
                        </Text>
                        <Text style={styles.supplierSubText}>
                          {s.businessName} • {s.businessCity}
                        </Text>
                      </View>
                    </TouchableOpacity>
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
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
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
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  clearButton: {
    padding: 4,
  },
  cityFilterRow: {
    backgroundColor: '#FFFFFF',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  cityChips: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  cityChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray100,
  },
  cityChipActive: {
    backgroundColor: colors.primaryLight,
  },
  cityChipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  cityChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  resultsContent: {
    padding: spacing.md,
    paddingBottom: 60,
  },
  emptyState: {
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
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.body2,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.subtitle2,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  businessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  businessAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: spacing.sm,
  },
  businessInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  businessName: {
    ...typography.subtitle2,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  businessCategory: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
    backgroundColor: colors.gray100,
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  itemTitle: {
    ...typography.subtitle2,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  itemPrice: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '800',
    marginTop: 3,
  },
  itemUnit: {
    fontWeight: '400',
    color: colors.textSecondary,
  },
  supplierSubText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
