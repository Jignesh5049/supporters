import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, Sparkles, Check, ChevronRight } from 'lucide-react-native';
import { useApp } from '../../src/context/AppContext';
import { colors, typography, spacing, borderRadius } from '../../src/styles/theme';

const POPULAR_CITIES = [
  'Ahmedabad',
  'Surat',
  'Mumbai',
  'Delhi NCR',
  'Bengaluru',
  'Pune',
  'Rajkot',
  'Vadodara',
  'Hyderabad',
  'Jaipur',
];

const INTEREST_CATEGORIES = [
  'Manufacturing & Industrial',
  'Textiles & Apparel',
  'Electronics & Electrical',
  'Construction & Real Estate',
  'Food & Agriculture',
  'Chemicals & Plastics',
  'Wholesale & Trading',
  'IT & Digital Services',
  'Automotive & Transport',
  'Packaging & Printing',
  'Professional Services',
  'Health & Medical',
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { showToast, updateUserProfile } = useApp();

  const [selectedCity, setSelectedCity] = useState('Ahmedabad');
  const [customCity, setCustomCity] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'Manufacturing & Industrial',
    'Textiles & Apparel',
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const handleCompleteOnboarding = () => {
    const finalCity = customCity.trim() || selectedCity;
    if (!finalCity) {
      showToast('Please select or enter your city', 'error');
      return;
    }
    if (selectedCategories.length === 0) {
      showToast('Please select at least one interest category', 'error');
      return;
    }

    setIsSubmitting(true);
    updateUserProfile({ city: finalCity });

    setTimeout(() => {
      setIsSubmitting(false);
      showToast('Welcome to Supporters!', 'success');
      router.replace('/(tabs)');
    }, 600);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.badge}>
            <Sparkles size={16} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.badgeText}>Quick Setup</Text>
          </View>
          <Text style={styles.title}>Personalize Your Feed</Text>
          <Text style={styles.subtitle}>
            Select your primary business city and industries to discover relevant local suppliers
            and buyer requirements.
          </Text>
        </View>

        {/* City Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPin size={18} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle}>Select Your City</Text>
          </View>

          <View style={styles.chipGrid}>
            {POPULAR_CITIES.map((city) => {
              const isSelected = selectedCity === city && !customCity;
              return (
                <TouchableOpacity
                  key={city}
                  style={[styles.cityChip, isSelected && styles.cityChipSelected]}
                  onPress={() => {
                    setSelectedCity(city);
                    setCustomCity('');
                  }}
                  accessibilityRole="button"
                >
                  <Text style={[styles.cityChipText, isSelected && styles.cityChipTextSelected]}>
                    {city}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            style={styles.customInput}
            placeholder="Or type another city..."
            placeholderTextColor={colors.gray400}
            value={customCity}
            onChangeText={(text) => {
              setCustomCity(text);
              if (text) setSelectedCity('');
            }}
          />
        </View>

        {/* Interests Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Industries of Interest</Text>
          <Text style={styles.sectionSubtitle}>
            Choose categories you want to source from or sell to:
          </Text>

          <View style={styles.categoriesContainer}>
            {INTEREST_CATEGORIES.map((cat) => {
              const isSelected = selectedCategories.includes(cat);
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryRow, isSelected && styles.categoryRowSelected]}
                  onPress={() => toggleCategory(cat)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                >
                  <Text
                    style={[styles.categoryRowText, isSelected && styles.categoryRowTextSelected]}
                  >
                    {cat}
                  </Text>
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Action */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, isSubmitting && styles.buttonDisabled]}
          onPress={handleCompleteOnboarding}
          disabled={isSubmitting}
          accessibilityRole="button"
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View style={styles.buttonContent}>
              <Text style={styles.continueButtonText}>Start Exploring Supporters</Text>
              <ChevronRight size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing['2xl'],
    paddingBottom: 100,
  },
  header: {
    marginBottom: spacing.xl,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
  },
  badgeText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body2,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.subtitle1,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cityChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cityChipSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  cityChipText: {
    ...typography.body2,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  cityChipTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  customInput: {
    height: 48,
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray300,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    color: colors.textPrimary,
  },
  categoriesContainer: {
    gap: spacing.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  categoryRowSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  categoryRowText: {
    ...typography.body2,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  categoryRowTextSelected: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.gray400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  continueButton: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
