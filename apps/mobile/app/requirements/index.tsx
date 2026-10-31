import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Plus,
  Filter,
  MapPin,
  Clock,
  Package,
  MessageSquare,
  ChevronRight,
} from 'lucide-react-native';
import { colors, typography, spacing, borderRadius } from '../../src/styles/theme';

export interface BuyerRequirement {
  id: string;
  title: string;
  category: string;
  buyerName: string;
  buyerCity: string;
  quantity: string;
  targetBudget: string;
  urgency: 'Immediate' | 'Within 15 Days' | 'Within 1 Month';
  description: string;
  quotesCount: number;
  createdAt: string;
}

export const SAMPLE_REQUIREMENTS: BuyerRequirement[] = [
  {
    id: 'req-1',
    title: 'Urgent: 50,000 Pcs Corrugated Shipping Boxes (3-Ply, Grade A)',
    category: 'Packaging & Printing',
    buyerName: 'AeroLogix Logistics Pvt Ltd',
    buyerCity: 'Ahmedabad',
    quantity: '50,000 units',
    targetBudget: '₹4,50,000',
    urgency: 'Immediate',
    description:
      'Looking for a reliable manufacturer for 3-ply brown corrugated boxes (12x10x8 inch). Must support 15kg load capacity. Immediate dispatch required for Surat warehouse.',
    quotesCount: 8,
    createdAt: '3 hours ago',
  },
  {
    id: 'req-2',
    title: 'Requirement for High-Grade Cotton Yarn (Count 40s Combed)',
    category: 'Textiles & Apparel',
    buyerName: 'Gujarat Fabrics LLP',
    buyerCity: 'Surat',
    quantity: '10 Tons',
    targetBudget: '₹28,00,000',
    urgency: 'Within 15 Days',
    description:
      '100% combed cotton yarn needed for garment manufacturing. Lab testing certificate required with sample delivery.',
    quotesCount: 14,
    createdAt: '1 day ago',
  },
  {
    id: 'req-3',
    title: 'CNC Machined Brass Bushings & Fasteners for Export',
    category: 'Manufacturing & Industrial',
    buyerName: 'Precision Dynamics',
    buyerCity: 'Rajkot',
    quantity: '25,000 pieces',
    targetBudget: '₹6,20,000',
    urgency: 'Within 1 Month',
    description:
      'Custom brass components per CAD drawing. ISO 9001 certified supplier preferred. Inspection at facility prior to final payment.',
    quotesCount: 5,
    createdAt: '2 days ago',
  },
  {
    id: 'req-4',
    title: 'Wholesale Procurement: Industrial LED Floodlights (100W IP66)',
    category: 'Electronics & Electrical',
    buyerName: 'Apex Infra Projects',
    buyerCity: 'Mumbai',
    quantity: '500 units',
    targetBudget: '₹3,75,000',
    urgency: 'Within 15 Days',
    description:
      'BIS-approved LED floodlights with 2-year replacement warranty needed for industrial park illumination.',
    quotesCount: 11,
    createdAt: '3 days ago',
  },
];

export default function RequirementsFeedScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [requirements, setRequirements] = useState<BuyerRequirement[]>(SAMPLE_REQUIREMENTS);

  const categories = [
    'All',
    'Packaging & Printing',
    'Textiles & Apparel',
    'Manufacturing & Industrial',
    'Electronics & Electrical',
  ];

  const filtered =
    selectedCategory === 'All'
      ? requirements
      : requirements.filter((r) => r.category === selectedCategory);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityLabel="Back"
          >
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Buyer Requirements</Text>
        </View>

        <TouchableOpacity
          style={styles.newPostButton}
          onPress={() => router.push('/requirements/new' as any)}
          accessibilityRole="button"
        >
          <Plus size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.newPostButtonText}>Post Requirement</Text>
        </TouchableOpacity>
      </View>

      {/* Categories Filter */}
      <View style={styles.categoriesBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryChips}
        >
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Requirements List */}
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtext}>
          {filtered.length} verified B2B buying requirements open for quotations
        </Text>

        {filtered.map((req) => (
          <TouchableOpacity
            key={req.id}
            style={styles.card}
            onPress={() => router.push(`/requirements/${req.id}` as any)}
            activeOpacity={0.85}
          >
            <View style={styles.cardHeader}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{req.category}</Text>
              </View>
              <View
                style={[
                  styles.urgencyBadge,
                  req.urgency === 'Immediate' && styles.urgencyImmediate,
                ]}
              >
                <Clock
                  size={12}
                  color={req.urgency === 'Immediate' ? colors.error : colors.primary}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.urgencyText,
                    req.urgency === 'Immediate' && { color: colors.error },
                  ]}
                >
                  {req.urgency}
                </Text>
              </View>
            </View>

            <Text style={styles.title}>{req.title}</Text>
            <Text style={styles.description} numberOfLines={2}>
              {req.description}
            </Text>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Package size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
                <Text style={styles.metaText}>
                  Qty: <Text style={styles.metaBold}>{req.quantity}</Text>
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaText}>
                  Budget: <Text style={styles.metaBoldHighlight}>{req.targetBudget}</Text>
                </Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.buyerInfo}>
                <MapPin size={12} color={colors.textSecondary} style={{ marginRight: 3 }} />
                <Text style={styles.buyerCityText}>
                  {req.buyerName} • {req.buyerCity}
                </Text>
              </View>

              <View style={styles.quoteAction}>
                <MessageSquare size={13} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={styles.quoteActionText}>{req.quotesCount} quotes</Text>
                <ChevronRight size={14} color={colors.primary} />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
  newPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    height: 38,
    borderRadius: borderRadius.full,
  },
  newPostButtonText: {
    ...typography.caption,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  categoriesBar: {
    backgroundColor: '#FFFFFF',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  categoryChips: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray100,
  },
  categoryChipActive: {
    backgroundColor: colors.primaryLight,
  },
  categoryChipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 60,
  },
  subtext: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  categoryBadge: {
    backgroundColor: colors.gray100,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  urgencyImmediate: {
    backgroundColor: '#FEE2E2',
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  title: {
    ...typography.subtitle1,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    lineHeight: 22,
  },
  description: {
    ...typography.body2,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  metaBold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  metaBoldHighlight: {
    fontWeight: '800',
    color: colors.primary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    paddingTop: spacing.sm,
  },
  buyerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  buyerCityText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  quoteAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quoteActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginRight: 2,
  },
});
