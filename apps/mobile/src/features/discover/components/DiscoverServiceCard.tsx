import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Bookmark, Send } from 'lucide-react-native';
import { colors } from '../../../styles/theme';
import type { Service } from '../../../../mock';

interface DiscoverServiceCardProps {
  service: Service;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  onRequestConsultation: (service: Service) => void;
}

export function DiscoverServiceCard({
  service,
  isSaved,
  onToggleSave,
  onRequestConsultation,
}: DiscoverServiceCardProps) {
  return (
    <View style={styles.card}>
      <Image
        source={{ uri: service.images[0] }}
        style={styles.image}
        contentFit="cover"
        transition={200}
      />
      <View style={styles.details}>
        <View style={styles.topRow}>
          <Text style={styles.categoryBadge}>{service.category}</Text>
          <View style={styles.badgeGroup}>
            <Text style={styles.slaBadge}>{service.availability}</Text>
            <TouchableOpacity
              onPress={() => onToggleSave(service.id)}
              style={[styles.savePillBtn, isSaved && styles.savePillBtnActive]}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Bookmark
                size={13}
                color={isSaved ? colors.primary : '#667085'}
                fill={isSaved ? colors.primary : 'transparent'}
              />
              <Text style={[styles.savePillText, isSaved && styles.savePillTextActive]}>
                {isSaved ? 'Saved' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {service.title}
        </Text>
        <Text style={styles.subtitle}>
          {service.businessName} · {service.businessCity}
        </Text>

        <View style={styles.pricingRow}>
          <Text style={styles.priceHighlight}>
            From ₹{service.startingPrice.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.unitBadge}>{service.priceUnit}</Text>
        </View>

        <TouchableOpacity
          style={styles.enquireButton}
          onPress={() => onRequestConsultation(service)}
          activeOpacity={0.85}
        >
          <Send size={12} color="#FFFFFF" />
          <Text style={styles.enquireButtonText}>Request Consultation</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  image: {
    width: 120,
    height: 140,
    backgroundColor: '#F3F4F6',
  },
  details: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryBadge: {
    fontSize: 10,
    fontWeight: '600',
    backgroundColor: '#E0F7FE',
    color: '#0284C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  slaBadge: {
    fontSize: 9,
    fontWeight: '600',
    color: '#0D9488',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  savePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  savePillBtnActive: {
    backgroundColor: '#EEF0FA',
  },
  savePillText: {
    fontSize: 11,
    color: '#667085',
    fontWeight: '500',
  },
  savePillTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  priceHighlight: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D9488',
  },
  unitBadge: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  enquireButton: {
    backgroundColor: '#0D9488',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 6,
    gap: 6,
    marginTop: 4,
  },
  enquireButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
