import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors } from '../../../styles/theme';

interface EditBusinessOperationsTabProps {
  openingHours: string;
  setOpeningHours: (v: string) => void;
  availabilityStatus: string;
  setAvailabilityStatus: (v: string) => void;
  priceRange: string;
  setPriceRange: (v: string) => void;
}

export function EditBusinessOperationsTab({
  openingHours,
  setOpeningHours,
  availabilityStatus,
  setAvailabilityStatus,
  priceRange,
  setPriceRange,
}: EditBusinessOperationsTabProps) {
  return (
    <View style={styles.formSection}>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Operating / Factory Working Hours</Text>
        <TextInput
          style={styles.textInput}
          value={openingHours}
          onChangeText={setOpeningHours}
          placeholder="Mon - Sat: 9:00 AM - 7:30 PM"
          placeholderTextColor="#94A3B8"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Stock & Dispatch Availability</Text>
        <TextInput
          style={styles.textInput}
          value={availabilityStatus}
          onChangeText={setAvailabilityStatus}
          placeholder="e.g. Immediate Dispatch Available, Made-to-Order (7 Days)"
          placeholderTextColor="#94A3B8"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Pricing Tier / Commercial Class</Text>
        <TextInput
          style={styles.textInput}
          value={priceRange}
          onChangeText={setPriceRange}
          placeholder="e.g. ₹₹ (Wholesale / Bulk Commercial)"
          placeholderTextColor="#94A3B8"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  formSection: {
    padding: 16,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: '#FFFFFF',
  },
});
