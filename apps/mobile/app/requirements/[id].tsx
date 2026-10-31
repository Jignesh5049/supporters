import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Share2,
  MapPin,
  Clock,
  Package,
  DollarSign,
  MessageSquare,
  ShieldCheck,
  Send,
  X,
  FileText,
} from 'lucide-react-native';
import { useApp } from '../../src/context/AppContext';
import { SAMPLE_REQUIREMENTS } from './index';
import { colors, typography, spacing, borderRadius } from '../../src/styles/theme';

export default function RequirementDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { openShareModal, showToast } = useApp();

  const req = SAMPLE_REQUIREMENTS.find((r) => r.id === id) || SAMPLE_REQUIREMENTS[0];

  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [quotePrice, setQuotePrice] = useState('');
  const [leadTime, setLeadTime] = useState('7 days');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendQuote = () => {
    if (!quotePrice.trim()) {
      showToast('Please enter your quotation price', 'error');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setQuoteModalOpen(false);
      showToast('Quotation sent to buyer successfully!', 'success');
    }, 700);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Requirement Details</Text>
        <TouchableOpacity
          onPress={() =>
            openShareModal({
              title: req.title,
              url: `https://supporters.app/requirements/${req.id}`,
            })
          }
          style={styles.backButton}
        >
          <Share2 size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
        <View style={styles.topStatus}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{req.category}</Text>
          </View>
          <View style={styles.urgencyBadge}>
            <Clock size={12} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={styles.urgencyText}>{req.urgency}</Text>
          </View>
        </View>

        <Text style={styles.title}>{req.title}</Text>
        <Text style={styles.timeText}>Posted {req.createdAt}</Text>

        {/* Specs Highlights Grid */}
        <View style={styles.highlightsGrid}>
          <View style={styles.highlightCard}>
            <Package size={18} color={colors.primary} style={{ marginBottom: 4 }} />
            <Text style={styles.highlightLabel}>Required Quantity</Text>
            <Text style={styles.highlightValue}>{req.quantity}</Text>
          </View>

          <View style={styles.highlightCard}>
            <DollarSign size={18} color={colors.success} style={{ marginBottom: 4 }} />
            <Text style={styles.highlightLabel}>Target Budget</Text>
            <Text style={[styles.highlightValue, { color: colors.success }]}>
              {req.targetBudget}
            </Text>
          </View>
        </View>

        {/* Buyer Information Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Buyer Information</Text>
          <View style={styles.buyerRow}>
            <View style={styles.buyerAvatar}>
              <Text style={styles.buyerInitials}>
                {req.buyerName.substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={styles.buyerDetails}>
              <View style={styles.buyerTitleRow}>
                <Text style={styles.buyerName}>{req.buyerName}</Text>
                <ShieldCheck size={16} color={colors.primary} style={{ marginLeft: 4 }} />
              </View>
              <View style={styles.locationRow}>
                <MapPin size={13} color={colors.textSecondary} style={{ marginRight: 3 }} />
                <Text style={styles.locationText}>{req.buyerCity}, India</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Detailed Scope */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Specifications & Description</Text>
          <Text style={styles.descriptionText}>{req.description}</Text>
        </View>

        {/* Quotes Received Info */}
        <View style={styles.quoteStatusCard}>
          <FileText size={20} color={colors.primary} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.quoteStatusTitle}>{req.quotesCount} Quotations Submitted</Text>
            <Text style={styles.quoteStatusSub}>
              Buyer is reviewing bids actively. Submit early to gain top priority.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Action */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => router.push('/(tabs)/messages' as any)}
        >
          <MessageSquare size={18} color={colors.textPrimary} style={{ marginRight: 6 }} />
          <Text style={styles.chatButtonText}>Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quoteButton} onPress={() => setQuoteModalOpen(true)}>
          <Send size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.quoteButtonText}>Submit Quotation</Text>
        </TouchableOpacity>
      </View>

      {/* Quote Submission Modal */}
      <Modal visible={quoteModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Submit Supplier Quote</Text>
              <TouchableOpacity onPress={() => setQuoteModalOpen(false)}>
                <X size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalItemTitle} numberOfLines={2}>
                {req.title}
              </Text>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Your Total Quotation Price (INR) *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. ₹4,20,000 (Incl. GST)"
                  placeholderTextColor={colors.gray400}
                  value={quotePrice}
                  onChangeText={setQuotePrice}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Estimated Lead Time / Dispatch *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. 5 to 7 business days"
                  placeholderTextColor={colors.gray400}
                  value={leadTime}
                  onChangeText={setLeadTime}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Quote Notes / Commercial Terms</Text>
                <TextInput
                  style={[styles.modalInput, { height: 90, textAlignVertical: 'top' }]}
                  placeholder="Payment terms, freight inclusion, inspection warranty..."
                  placeholderTextColor={colors.gray400}
                  multiline
                  numberOfLines={4}
                  value={quoteNotes}
                  onChangeText={setQuoteNotes}
                />
              </View>

              <TouchableOpacity
                style={[styles.modalSubmitButton, isSubmitting && { opacity: 0.5 }]}
                onPress={handleSendQuote}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitButtonText}>Send Quote to Buyer</Text>
                )}
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.subtitle1,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  topStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  urgencyText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.xs,
    marginBottom: 4,
    lineHeight: 26,
  },
  timeText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  highlightsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  highlightCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: spacing.md,
  },
  highlightLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  highlightValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeading: {
    ...typography.subtitle2,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  buyerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buyerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  buyerInitials: {
    fontWeight: '800',
    color: colors.primary,
    fontSize: 15,
  },
  buyerDetails: {
    flex: 1,
  },
  buyerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buyerName: {
    ...typography.subtitle2,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  descriptionText: {
    ...typography.body2,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  quoteStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  quoteStatusTitle: {
    ...typography.subtitle2,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  quoteStatusSub: {
    ...typography.caption,
    color: colors.primaryDark,
    marginTop: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    gap: spacing.sm,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray100,
  },
  chatButtonText: {
    ...typography.body2,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  quoteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  quoteButtonText: {
    ...typography.body2,
    fontWeight: '700',
    color: '#FFFFFF',
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
    maxHeight: '80%',
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
  modalItemTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  modalInputGroup: {
    marginBottom: spacing.md,
  },
  modalLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  modalInput: {
    height: 48,
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray300,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    color: colors.textPrimary,
  },
  modalSubmitButton: {
    backgroundColor: colors.primary,
    height: 50,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  modalSubmitButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
