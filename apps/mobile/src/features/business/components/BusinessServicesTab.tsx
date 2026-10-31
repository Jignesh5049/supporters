import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Bookmark, Clock, Send, Wrench } from 'lucide-react-native';
import { Service } from '../../../mock';
import { colors, spacing, borderRadius } from '../../../styles/theme';

interface BusinessServicesTabProps {
  services: Service[];
  savedServiceIds: string[];
  onToggleSave: (id: string) => void;
  onOpenService: (id: string) => void;
  onOpenEnquiry: (service: Service) => void;
}

export function BusinessServicesTab({
  services,
  savedServiceIds,
  onToggleSave,
  onOpenService,
  onOpenEnquiry,
}: BusinessServicesTabProps) {
  if (services.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Wrench size={40} color={colors.textMuted} style={{ marginBottom: 8 }} />
        <Text style={styles.emptyTitle}>No services listed</Text>
        <Text style={styles.emptyText}>This business hasn't published service offerings.</Text>
      </View>
    );
  }

  return (
    <View style={styles.listContainer}>
      {services.map((item) => {
        const isSaved = savedServiceIds.includes(item.id);
        return (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            onPress={() => onOpenService(item.id)}
            activeOpacity={0.85}
          >
            <Image
              source={{ uri: item.images[0] }}
              style={styles.serviceImage}
              contentFit="cover"
              cachePolicy="disk"
            />

            <View style={styles.serviceContent}>
              <View style={styles.titleRow}>
                <Text style={styles.serviceTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <TouchableOpacity
                  onPress={() => onToggleSave(item.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Bookmark
                    size={18}
                    color={isSaved ? colors.primary : colors.textSecondary}
                    fill={isSaved ? colors.primary : 'none'}
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.priceText}>
                From ₹{item.startingPrice.toLocaleString('en-IN')}{' '}
                <Text style={styles.unitText}>{item.priceUnit}</Text>
              </Text>

              <View style={styles.badgeRow}>
                <View style={styles.availabilityBadge}>
                  <Clock size={10} color={colors.primary} style={{ marginRight: 3 }} />
                  <Text style={styles.availabilityText}>{item.availability}</Text>
                </View>
                <Text style={styles.areaText}>{item.serviceArea}</Text>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.enquireButton} onPress={() => onOpenEnquiry(item)}>
                  <Send size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.enquireButtonText}>Request Quote</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    padding: spacing.md,
    gap: spacing.md,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  serviceImage: {
    width: 90,
    height: 90,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.gray100,
  },
  serviceContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  serviceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 6,
    lineHeight: 18,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 2,
  },
  unitText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  availabilityText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  areaText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  actionRow: {
    marginTop: 6,
  },
  enquireButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  enquireButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
});
