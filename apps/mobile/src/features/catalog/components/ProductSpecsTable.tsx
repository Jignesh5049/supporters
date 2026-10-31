import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Layers } from 'lucide-react-native';
import { colors } from '../../../styles/theme';

interface ProductSpecsTableProps {
  specifications?: Record<string, string>;
}

export function ProductSpecsTable({ specifications }: ProductSpecsTableProps) {
  if (!specifications || Object.keys(specifications).length === 0) {
    return null;
  }

  const entries = Object.entries(specifications);

  return (
    <View style={styles.specsCard}>
      <View style={styles.specsHeader}>
        <Layers size={18} color={colors.primary} />
        <Text style={styles.specsTitle}>Technical & Commercial Specifications</Text>
      </View>

      <View style={styles.specsList}>
        {entries.map(([key, val], idx) => (
          <View
            key={key}
            style={[styles.specRow, idx === entries.length - 1 && { borderBottomWidth: 0 }]}
          >
            <Text style={styles.specItemLabel}>{key}</Text>
            <Text style={styles.specItemValue}>{val}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  specsCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  specsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  specsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  specsList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  specItemLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  specItemValue: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
