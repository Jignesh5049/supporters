import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MapPin, Clock, Package, ChevronRight } from 'lucide-react-native';
import { colors } from '../../../styles/theme';
import type { BuyerRequirement } from '../types';

export interface RequirementCardProps {
  requirement: BuyerRequirement;
  onPress: () => void;
  onSubmitQuote?: () => void;
}

export function RequirementCard({ requirement, onPress, onSubmitQuote }: RequirementCardProps) {
  const isImmediate = requirement.urgency === 'Immediate';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityLabel={requirement.title}
    >
      <View style={styles.topRow}>
        <View style={styles.categoryPill}>
          <Text style={styles.categoryText}>{requirement.category}</Text>
        </View>
        <View style={[styles.urgencyPill, isImmediate && styles.urgencyPillImmediate]}>
          <Clock size={11} color={isImmediate ? '#DC2626' : '#2563EB'} />
          <Text style={[styles.urgencyText, isImmediate && styles.urgencyTextImmediate]}>
            {requirement.urgency}
          </Text>
        </View>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {requirement.title}
      </Text>

      <View style={styles.buyerRow}>
        <Text style={styles.buyerName}>{requirement.buyerName}</Text>
        <View style={styles.cityRow}>
          <MapPin size={12} color="#6B7280" />
          <Text style={styles.cityText}>{requirement.buyerCity}</Text>
        </View>
      </View>

      <View style={styles.specGrid}>
        <View style={styles.specItem}>
          <Text style={styles.specLabel}>Quantity</Text>
          <View style={styles.specValueRow}>
            <Package size={13} color={colors.primary} />
            <Text style={styles.specValue}>{requirement.quantity}</Text>
          </View>
        </View>

        <View style={styles.specItem}>
          <Text style={styles.specLabel}>Target Budget</Text>
          <Text style={styles.budgetValue}>{requirement.targetBudget}</Text>
        </View>

        <View style={styles.specItem}>
          <Text style={styles.specLabel}>Quotes Received</Text>
          <Text style={styles.specValue}>{requirement.quotesCount} proposals</Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.postedTime}>Posted {requirement.createdAt}</Text>
        <View style={styles.ctaRow}>
          {onSubmitQuote ? (
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={(e) => {
                e.stopPropagation();
                onSubmitQuote();
              }}
            >
              <Text style={styles.submitBtnText}>Submit Quote</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.viewDetailsRow}>
              <Text style={styles.viewDetailsText}>View RFQ</Text>
              <ChevronRight size={14} color={colors.primary} />
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryPill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  urgencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  urgencyPillImmediate: {
    backgroundColor: '#FEF2F2',
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  urgencyTextImmediate: {
    color: '#DC2626',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: 6,
  },
  buyerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  buyerName: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  cityText: {
    fontSize: 11,
    color: '#6B7280',
  },
  specGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  specItem: {
    flex: 1,
  },
  specLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    marginBottom: 3,
  },
  specValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  specValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  budgetValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#16A34A',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  postedTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  viewDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
});
