import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapPin, Instagram, Clock } from 'lucide-react-native';
import { colors } from '../../../styles/theme';
import type { MyBusiness } from '@supporters/shared';
import { openingHoursSummary } from '../../business/labels';

interface HubStorefrontHighlightsProps {
  business: MyBusiness;
}

export function HubStorefrontHighlights({ business }: HubStorefrontHighlightsProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Storefront Key Information</Text>
      <View style={styles.infoRow}>
        <MapPin size={13} color="#64748B" />
        <Text style={styles.infoText} numberOfLines={1}>
          {[business.address, business.city.name, business.state.name].filter(Boolean).join(', ')}
        </Text>
      </View>
      <View style={styles.infoRow}>
        <Instagram size={13} color="#A3238E" />
        <Text style={[styles.infoText, { color: '#A3238E' }]}>
          {business.socials.instagram ?? 'Add your Instagram link'}
        </Text>
      </View>
      <View style={styles.infoRow}>
        <Clock size={13} color="#64748B" />
        <Text style={styles.infoText}>
          {openingHoursSummary(business.openingHours) ?? 'Add your opening hours'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
});
