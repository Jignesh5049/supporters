import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Search } from 'lucide-react-native';
import { colors } from '../styles/theme';
import { useApp } from '../context/AppContext';
import { SAMPLE_REQUIREMENTS, BuyerRequirement } from '../features/requirements/types';
import { RequirementCard, QuoteSubmissionModal } from '../features/requirements/components';

export function RequirementsScreen() {
  const router = useRouter();
  const { showToast } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [quoteTarget, setQuoteTarget] = useState<BuyerRequirement | null>(null);

  const categories = [
    'All',
    'Packaging & Printing',
    'Textiles & Apparel',
    'Engineering & Machinery',
    'Chemicals & Plastics',
  ];

  const filteredRequirements = SAMPLE_REQUIREMENTS.filter((req) => {
    const matchesSearch =
      req.title.toLowerCase().includes(search.toLowerCase()) ||
      req.buyerCity.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || req.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleQuoteSubmit = (_data: {
    pricePerUnit: string;
    deliveryDays: string;
    note: string;
  }) => {
    showToast('Quotation proposal submitted successfully!', 'success');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Buyer Requirements (RFQ)</Text>
          <TouchableOpacity
            style={styles.newButton}
            onPress={() => router.push('/requirements/new' as any)}
          >
            <Plus size={16} color="#FFFFFF" />
            <Text style={styles.newButtonText}>Post RFQ</Text>
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={styles.searchBar}>
          <Search size={16} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tenders, materials, cities..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Category Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryPill, selectedCategory === cat && styles.categoryPillActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  selectedCategory === cat && styles.categoryPillTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.resultsCount}>Active Requests ({filteredRequirements.length})</Text>
        {filteredRequirements.map((req) => (
          <RequirementCard
            key={req.id}
            requirement={req}
            onPress={() => router.push(`/requirements/${req.id}` as any)}
            onSubmitQuote={() => setQuoteTarget(req)}
          />
        ))}
      </ScrollView>

      {/* Quotation Submission Modal */}
      <QuoteSubmissionModal
        visible={Boolean(quoteTarget)}
        requirement={quoteTarget}
        onClose={() => setQuoteTarget(null)}
        onSubmit={handleQuoteSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 14,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  newButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
  },
  filterList: {
    gap: 8,
    paddingVertical: 2,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
  },
  categoryPillActive: {
    backgroundColor: colors.primary,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 14,
    paddingBottom: 30,
  },
  resultsCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
});
