import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Package, MapPin, Clock, Sparkles, ChevronDown } from 'lucide-react-native';
import { useApp } from '../../src/context/AppContext';
import { colors, typography, spacing, borderRadius } from '../../src/styles/theme';

const CATEGORIES = [
  'Packaging & Printing',
  'Textiles & Apparel',
  'Manufacturing & Industrial',
  'Electronics & Electrical',
  'Construction & Real Estate',
  'Food & Agriculture',
  'Chemicals & Plastics',
  'Wholesale & Trading',
  'IT & Digital Services',
];

const URGENCIES = ['Immediate', 'Within 15 Days', 'Within 1 Month'];

export default function NewRequirementScreen() {
  const router = useRouter();
  const { showToast } = useApp();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [quantity, setQuantity] = useState('');
  const [targetBudget, setTargetBudget] = useState('');
  const [city, setCity] = useState('');
  const [urgency, setUrgency] = useState('Within 15 Days');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!title.trim()) {
      showToast('Please enter what you are looking to buy', 'error');
      return;
    }
    if (!quantity.trim()) {
      showToast('Please specify quantity and units', 'error');
      return;
    }
    if (!description.trim()) {
      showToast('Please add detailed specifications or requirements', 'error');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      showToast('Requirement posted! Suppliers will start sending quotes.', 'success');
      router.back();
    }, 800);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post Buyer Requirement</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.banner}>
          <Sparkles size={18} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.bannerText}>
            Verified suppliers in your region will review your specifications and submit competitive
            quotes.
          </Text>
        </View>

        {/* Title */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Product / Material Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 50,000 Pcs Corrugated Shipping Boxes (3-Ply)"
            placeholderTextColor={colors.gray400}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Category Chips */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Industry Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryChips}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Quantity & Budget */}
        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1, marginRight: spacing.sm }]}>
            <Text style={styles.label}>Required Quantity *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 10,000 Pcs / 5 Tons"
              placeholderTextColor={colors.gray400}
              value={quantity}
              onChangeText={setQuantity}
            />
          </View>

          <View style={[styles.formGroup, { flex: 1, marginLeft: spacing.sm }]}>
            <Text style={styles.label}>Target Budget (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. ₹5,00,000"
              placeholderTextColor={colors.gray400}
              value={targetBudget}
              onChangeText={setTargetBudget}
            />
          </View>
        </View>

        {/* Delivery Location & Urgency */}
        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1, marginRight: spacing.sm }]}>
            <Text style={styles.label}>Delivery City</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Surat, Gujarat"
              placeholderTextColor={colors.gray400}
              value={city}
              onChangeText={setCity}
            />
          </View>

          <View style={[styles.formGroup, { flex: 1, marginLeft: spacing.sm }]}>
            <Text style={styles.label}>Timeline / Urgency</Text>
            <View style={styles.urgencyRow}>
              {URGENCIES.map((u) => {
                const isSelected = urgency === u;
                return (
                  <TouchableOpacity
                    key={u}
                    style={[styles.urgencyButton, isSelected && styles.urgencyButtonActive]}
                    onPress={() => setUrgency(u)}
                  >
                    <Text style={[styles.urgencyText, isSelected && styles.urgencyTextActive]}>
                      {u}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Detailed Description */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Detailed Specifications & Terms *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Mention technical specs, dimensions, material grade, certification requirements, delivery terms, and payment preference..."
            placeholderTextColor={colors.gray400}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Publish Requirement</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
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
    paddingBottom: 60,
  },
  banner: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  bannerText: {
    ...typography.caption,
    color: colors.primaryDark,
    flex: 1,
    lineHeight: 18,
    fontWeight: '500',
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    height: 48,
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray300,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    color: colors.textPrimary,
  },
  textArea: {
    height: 120,
    paddingTop: spacing.sm,
  },
  categoryChips: {
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray100,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  urgencyRow: {
    flexDirection: 'column',
    gap: 4,
  },
  urgencyButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.gray100,
    alignItems: 'center',
  },
  urgencyButtonActive: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  urgencyText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  urgencyTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  submitButton: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
