import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { CheckCircle2, ExternalLink, Zap } from 'lucide-react-native';
import { colors } from '../../../styles/theme';
import type { Business } from '../../../../mock';

interface ProductSupplierCardProps {
  business: Business;
  onVisitStorefront: () => void;
}

export function ProductSupplierCard({ business, onVisitStorefront }: ProductSupplierCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.header}>Verified Supplier</Text>
      <View style={styles.supplierRow}>
        <Image
          source={{ uri: business.avatar }}
          style={styles.avatar}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.detailsCol}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {business.name}
            </Text>
            {business.verified && (
              <CheckCircle2 size={14} color={colors.accentCyan} fill={colors.accentCyan} />
            )}
          </View>
          <Text style={styles.subtitle}>
            {business.category} · {business.city}, {business.state}
          </Text>
          <View style={styles.responseRow}>
            <Zap size={12} color="#D97706" fill="#D97706" />
            <Text style={styles.response}>Responds in {business.responseRate}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.viewStorefrontBtn}
        onPress={onVisitStorefront}
        activeOpacity={0.8}
      >
        <ExternalLink size={14} color={colors.primary} />
        <Text style={styles.viewStorefrontText}>Visit Business Storefront</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  header: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  supplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  detailsCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  responseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  response: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '500',
  },
  viewStorefrontBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    backgroundColor: '#EEF0FA',
    gap: 6,
  },
  viewStorefrontText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
});
