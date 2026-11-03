import React from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import {
  Building2,
  Calendar,
  Clock,
  FileCheck,
  Globe,
  MapPin,
  ShieldCheck,
  Tag,
} from 'lucide-react-native';
import { Business } from '../../../mock';
import { colors, spacing, borderRadius } from '../../../styles/theme';

interface BusinessAboutTabProps {
  business: Business;
}

export function BusinessAboutTab({ business }: BusinessAboutTabProps) {
  const handleOpenWebsite = () => {
    if (business.website) {
      const url = business.website.startsWith('http')
        ? business.website
        : `https://${business.website}`;
      Linking.openURL(url).catch(() => {});
    }
  };

  return (
    <View style={styles.container}>
      {/* Overview Card */}
      <View style={styles.card}>
        <Text style={styles.cardHeading}>About {business.name}</Text>
        <Text style={styles.aboutText}>{business.about}</Text>
      </View>

      {/* Verification & Trust Badge */}
      <View style={styles.trustCard}>
        <ShieldCheck size={24} color={colors.primary} style={{ marginRight: 10 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.trustTitle}>
            {business.verified ? 'Verified Business' : 'Community Member'}
          </Text>
          <Text style={styles.trustSub}>
            {business.verified
              ? 'Identity and business registration credentials verified by Supporters compliance.'
              : 'Registered account on Supporters B2B network.'}
          </Text>
        </View>
      </View>

      {/* Key Business Details Grid */}
      <View style={styles.card}>
        <Text style={styles.cardHeading}>Business Information</Text>

        <View style={styles.detailRow}>
          <Building2 size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <Text style={styles.detailLabel}>Business Type:</Text>
          <Text style={styles.detailValue}>{business.businessType}</Text>
        </View>

        {business.gstin && (
          <View style={styles.detailRow}>
            <FileCheck size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <Text style={styles.detailLabel}>GSTIN:</Text>
            <Text style={[styles.detailValue, { fontFamily: 'monospace' }]}>{business.gstin}</Text>
          </View>
        )}

        <View style={styles.detailRow}>
          <Calendar size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <Text style={styles.detailLabel}>Established:</Text>
          <Text style={styles.detailValue}>{business.establishedYear}</Text>
        </View>

        <View style={styles.detailRow}>
          <Clock size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <Text style={styles.detailLabel}>Avg Response:</Text>
          <Text style={styles.detailValue}>{business.responseRate}</Text>
        </View>

        <View style={styles.detailRow}>
          <MapPin size={16} color={colors.textSecondary} style={{ marginRight: 8, marginTop: 2 }} />
          <Text style={styles.detailLabel}>Address:</Text>
          <Text style={[styles.detailValue, { flex: 1 }]}>{business.fullAddress}</Text>
        </View>

        {business.website && (
          <TouchableOpacity style={styles.detailRow} onPress={handleOpenWebsite}>
            <Globe size={16} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.detailLabel}>Website:</Text>
            <Text
              style={[
                styles.detailValue,
                { color: colors.primary, textDecorationLine: 'underline' },
              ]}
            >
              {business.website}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Business Specialization Tags */}
      {business.tags && business.tags.length > 0 && (
        <View style={styles.card}>
          <View style={styles.tagHeader}>
            <Tag size={16} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.cardHeading}>Industry Tags</Text>
          </View>
          <View style={styles.tagsContainer}>
            {business.tags.map((tag, idx) => (
              <View key={idx} style={styles.tagChip}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.md,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cardHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  aboutText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  trustCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  trustTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  trustSub: {
    fontSize: 11,
    color: colors.primaryDark,
    marginTop: 2,
    lineHeight: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginRight: 6,
  },
  detailValue: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  tagHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  tagChip: {
    backgroundColor: colors.gray100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  tagText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
