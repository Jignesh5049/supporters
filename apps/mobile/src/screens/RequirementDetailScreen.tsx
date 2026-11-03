import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Share2,
  Clock,
  MapPin,
  Package,
  Send,
  Building2,
  ShieldCheck,
} from 'lucide-react-native';
import { colors } from '../styles/theme';
import { useApp } from '../context/AppContext';
import { SAMPLE_REQUIREMENTS } from '../features/requirements/types';
import { QuoteSubmissionModal } from '../features/requirements/components';

export function RequirementDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showToast, openShareModal } = useApp();

  const req = SAMPLE_REQUIREMENTS.find((r) => r.id === id) || SAMPLE_REQUIREMENTS[0];
  const [modalOpen, setModalOpen] = useState(false);

  const handleQuoteSubmit = (_data: {
    pricePerUnit: string;
    deliveryDays: string;
    note: string;
  }) => {
    showToast('Your quotation has been dispatched to the buyer!', 'success');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>RFQ Overview</Text>
        <TouchableOpacity
          onPress={() =>
            openShareModal({
              title: req.title,
              url: `https://supporters.in/requirements/${req.id}`,
            })
          }
          style={styles.backButton}
        >
          <Share2 size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Urgency Badge */}
        <View style={styles.badgeRow}>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText}>{req.category}</Text>
          </View>
          <View style={styles.urgencyPill}>
            <Clock size={12} color="#DC2626" />
            <Text style={styles.urgencyText}>{req.urgency} Requirement</Text>
          </View>
        </View>

        <Text style={styles.title}>{req.title}</Text>
        <Text style={styles.postedTime}>Posted {req.createdAt} • Surat Verified Tender</Text>

        {/* Spec Overview Card */}
        <View style={styles.specCard}>
          <View style={styles.specRow}>
            <View style={styles.specCol}>
              <Text style={styles.specLabel}>Required Quantity</Text>
              <Text style={styles.specValue}>{req.quantity}</Text>
            </View>
            <View style={styles.specCol}>
              <Text style={styles.specLabel}>Target Budget</Text>
              <Text style={styles.budgetValue}>{req.targetBudget}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.specRow}>
            <View style={styles.specCol}>
              <Text style={styles.specLabel}>Buyer Location</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <MapPin size={13} color="#4B5563" />
                <Text style={styles.specValue}>{req.buyerCity}</Text>
              </View>
            </View>
            <View style={styles.specCol}>
              <Text style={styles.specLabel}>Proposals Submitted</Text>
              <Text style={styles.specValue}>{req.quotesCount} Suppliers</Text>
            </View>
          </View>
        </View>

        {/* Buyer Profile Snippet */}
        <View style={styles.buyerCard}>
          <Building2 size={24} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.buyerName}>{req.buyerName}</Text>
              <ShieldCheck size={14} color="#16A34A" />
            </View>
            <Text style={styles.buyerMeta}>Verified B2B Enterprise Buyer • {req.buyerCity}</Text>
          </View>
        </View>

        {/* Detailed Requirement Description */}
        <View style={styles.descSection}>
          <Text style={styles.descTitle}>Technical Specifications & Scope</Text>
          <Text style={styles.descText}>{req.description}</Text>
        </View>

        {/* Buyer Notes */}
        <View style={styles.notesCard}>
          <Text style={styles.notesTitle}>Instructions for Suppliers</Text>
          <Text style={styles.notesText}>
            • Direct manufacturers and verified stockists preferred.{'\n'}• Quotation must include
            GST breakup and delivery lead time.{'\n'}• Sample approval required prior to full
            production run.
          </Text>
        </View>
      </ScrollView>

      {/* Floating Bottom Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.submitBtn} onPress={() => setModalOpen(true)}>
          <Send size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.submitBtnText}>Submit Quotation Proposal</Text>
        </TouchableOpacity>
      </View>

      <QuoteSubmissionModal
        visible={modalOpen}
        requirement={req}
        onClose={() => setModalOpen(false)}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  backButton: {
    padding: 6,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  categoryPill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  urgencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 24,
    marginBottom: 4,
  },
  postedTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  specCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  specRow: {
    flexDirection: 'row',
  },
  specCol: {
    flex: 1,
  },
  specLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 3,
  },
  specValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  budgetValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#16A34A',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  buyerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  buyerName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  buyerMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  descSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  descTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  descText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  notesCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 6,
  },
  notesText: {
    fontSize: 12,
    color: '#3B82F6',
    lineHeight: 18,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 14,
    paddingBottom: 24,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
