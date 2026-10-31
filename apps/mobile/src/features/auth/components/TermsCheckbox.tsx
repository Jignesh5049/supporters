import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors } from '../../../styles/theme';

interface TermsCheckboxProps {
  agreed: boolean;
  onToggle: () => void;
  onOpenTerms: () => void;
  error?: string | null;
}

export function TermsCheckbox({ agreed, onToggle, onOpenTerms, error }: TermsCheckboxProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.row}
        onPress={onToggle}
        activeOpacity={0.8}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: agreed }}
      >
        <View
          style={[
            styles.checkbox,
            agreed && styles.checkboxActive,
            error ? styles.checkboxError : null,
          ]}
        >
          {agreed && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
        </View>
        <Text style={styles.label}>
          I agree to the{' '}
          <Text style={styles.link} onPress={onOpenTerms}>
            Terms & Conditions
          </Text>
        </Text>
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxError: {
    borderColor: colors.danger,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  link: {
    color: colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  errorText: {
    fontSize: 11,
    color: colors.danger,
    marginTop: 4,
    fontWeight: '500',
  },
});
