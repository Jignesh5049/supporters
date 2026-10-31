import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { colors } from '../../../styles/theme';

export interface BusinessSummary {
  id: string;
  name: string;
  avatar?: string;
  verified?: boolean;
  businessType?: string;
  city?: string;
  state?: string;
  rating?: number;
}

export interface ServiceVendorCardProps {
  business: BusinessSummary;
  onPress: () => void;
}

export function ServiceVendorCard({ business, onPress }: ServiceVendorCardProps) {
  return (
    <TouchableOpacity style={styles.businessCard} onPress={onPress}>
      {business.avatar ? (
        <Image source={{ uri: business.avatar }} style={styles.businessAvatar} />
      ) : null}
      <View style={styles.businessDetails}>
        <View style={styles.businessNameRow}>
          <Text style={styles.businessName}>{business.name}</Text>
          {business.verified && <ShieldCheck size={16} color="#16A34A" style={{ marginLeft: 4 }} />}
        </View>
        <Text style={styles.businessMeta}>
          {business.businessType} • {business.city}, {business.state}
        </Text>
        {business.rating ? (
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>★ {business.rating} Rating</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  businessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  businessAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: '#E5E7EB',
  },
  businessDetails: {
    flex: 1,
  },
  businessNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  businessName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  businessMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  ratingBadge: {
    marginTop: 4,
  },
  ratingText: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '700',
  },
});
