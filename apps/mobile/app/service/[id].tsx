import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Share2,
  Bookmark,
  MessageSquare,
  Phone,
  Send,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react-native';
import { useApp } from '../../src/context/AppContext';
import { colors, typography, spacing, borderRadius } from '../../src/styles/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ServiceDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    services,
    businesses,
    savedServiceIds,
    toggleSaveService,
    openEnquiryModal,
    openConversationWithBusiness,
    openShareModal,
  } = useApp();

  const service = services.find((s) => s.id === id) || services[0];
  const business = businesses.find((b) => b.id === service?.businessId) || businesses[0];

  const [selectedImgIdx, setSelectedImgIdx] = useState(0);
  const isSaved = savedServiceIds.includes(service.id);

  const moreServices = services.filter(
    (s) => s.id !== service.id && s.businessId === service.businessId,
  );

  const handleCall = () => {
    if (business.phone) {
      Linking.openURL(`tel:${business.phone}`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Floating App Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.iconButton}
          accessibilityLabel="Back"
          accessibilityRole="button"
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.topBarActions}>
          <TouchableOpacity
            onPress={() =>
              openShareModal({
                title: service.title,
                url: `https://supporters.app/service/${service.id}`,
              })
            }
            style={styles.iconButton}
            accessibilityLabel="Share"
            accessibilityRole="button"
          >
            <Share2 size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => toggleSaveService(service.id)}
            style={styles.iconButton}
            accessibilityLabel="Save service"
            accessibilityRole="button"
          >
            <Bookmark
              size={20}
              color={isSaved ? colors.primary : colors.textPrimary}
              fill={isSaved ? colors.primary : 'none'}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Service Media Gallery */}
        <View style={styles.mediaContainer}>
          <Image
            source={{ uri: service.images[selectedImgIdx] || service.images[0] }}
            style={styles.mainImage}
            resizeMode="cover"
          />

          {service.images.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailRow}
            >
              {service.images.map((img, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setSelectedImgIdx(idx)}
                  style={[
                    styles.thumbnailWrapper,
                    selectedImgIdx === idx && styles.thumbnailActive,
                  ]}
                >
                  <Image source={{ uri: img }} style={styles.thumbnailImage} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Content Section */}
        <View style={styles.body}>
          {/* Category & Availability Tag */}
          <View style={styles.tagRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{service.category}</Text>
            </View>
            <View style={styles.availabilityBadge}>
              <Clock size={12} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.availabilityText}>{service.availability}</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>{service.title}</Text>

          {/* Pricing */}
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Starting from</Text>
            <Text style={styles.priceValue}>
              ₹{service.startingPrice.toLocaleString('en-IN')}{' '}
              <Text style={styles.priceUnit}>{service.priceUnit}</Text>
            </Text>
          </View>

          {/* Business Supplier Card */}
          <TouchableOpacity
            style={styles.supplierCard}
            onPress={() => router.push(`/business/${business.id}` as any)}
            activeOpacity={0.85}
          >
            <Image source={{ uri: business.avatar }} style={styles.businessAvatar} />
            <View style={styles.businessInfo}>
              <View style={styles.businessNameRow}>
                <Text style={styles.businessName} numberOfLines={1}>
                  {business.name}
                </Text>
                {business.verified && (
                  <ShieldCheck size={16} color={colors.primary} style={{ marginLeft: 4 }} />
                )}
              </View>
              <View style={styles.locationRow}>
                <MapPin size={13} color={colors.textSecondary} style={{ marginRight: 3 }} />
                <Text style={styles.locationText}>
                  {business.city}, {business.state}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Service Area & Details */}
          <View style={styles.infoCard}>
            <Text style={styles.sectionHeading}>Service Coverage</Text>
            <Text style={styles.infoText}>
              {service.serviceArea || 'Pan India / Remote & On-Site'}
            </Text>
          </View>

          {/* Description */}
          <View style={styles.infoCard}>
            <Text style={styles.sectionHeading}>Service Description</Text>
            <Text style={styles.descriptionText}>{service.description}</Text>
          </View>

          {/* Key Deliverables / Inclusions */}
          <View style={styles.infoCard}>
            <Text style={styles.sectionHeading}>What You Get</Text>
            <View style={styles.deliverableItem}>
              <CheckCircle2
                size={16}
                color={colors.success}
                style={{ marginRight: 8, marginTop: 2 }}
              />
              <Text style={styles.deliverableText}>Dedicated project manager & consultation</Text>
            </View>
            <View style={styles.deliverableItem}>
              <CheckCircle2
                size={16}
                color={colors.success}
                style={{ marginRight: 8, marginTop: 2 }}
              />
              <Text style={styles.deliverableText}>Complete execution and testing</Text>
            </View>
            <View style={styles.deliverableItem}>
              <CheckCircle2
                size={16}
                color={colors.success}
                style={{ marginRight: 8, marginTop: 2 }}
              />
              <Text style={styles.deliverableText}>Post-service support & milestone updates</Text>
            </View>
          </View>

          {/* More Services */}
          {moreServices.length > 0 && (
            <View style={styles.moreSection}>
              <Text style={styles.sectionHeading}>More Services from {business.name}</Text>
              {moreServices.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.moreCard}
                  onPress={() => router.push(`/service/${item.id}` as any)}
                >
                  <Image source={{ uri: item.images[0] }} style={styles.moreImage} />
                  <View style={styles.moreInfo}>
                    <Text style={styles.moreTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.morePrice}>
                      ₹{item.startingPrice.toLocaleString('en-IN')} {item.priceUnit}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Fixed Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => openConversationWithBusiness(business.id)}
          accessibilityRole="button"
        >
          <MessageSquare size={18} color={colors.textPrimary} style={{ marginRight: 6 }} />
          <Text style={styles.chatButtonText}>Chat</Text>
        </TouchableOpacity>

        {business.phone ? (
          <TouchableOpacity
            style={styles.callButton}
            onPress={handleCall}
            accessibilityRole="button"
          >
            <Phone size={18} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.callButtonText}>Call</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={styles.enquiryButton}
          onPress={() =>
            openEnquiryModal({
              title: service.title,
              businessName: business.name,
              businessId: business.id,
            })
          }
          accessibilityRole="button"
        >
          <Send size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.enquiryButtonText}>Book / Enquire</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  mediaContainer: {
    backgroundColor: '#FFFFFF',
    paddingBottom: spacing.md,
  },
  mainImage: {
    width: SCREEN_WIDTH,
    height: 260,
    backgroundColor: colors.gray100,
  },
  thumbnailRow: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  thumbnailWrapper: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailActive: {
    borderColor: colors.primary,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  body: {
    padding: spacing.md,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  categoryBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  categoryText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  availabilityText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  priceRow: {
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    marginBottom: spacing.md,
  },
  priceLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },
  priceUnit: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  supplierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    marginBottom: spacing.md,
  },
  businessAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: spacing.md,
  },
  businessInfo: {
    flex: 1,
  },
  businessNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  businessName: {
    ...typography.subtitle1,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    marginBottom: spacing.md,
  },
  sectionHeading: {
    ...typography.subtitle2,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  infoText: {
    ...typography.body2,
    color: colors.textPrimary,
  },
  descriptionText: {
    ...typography.body2,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  deliverableItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.xs,
  },
  deliverableText: {
    ...typography.body2,
    color: colors.textPrimary,
    flex: 1,
  },
  moreSection: {
    marginTop: spacing.md,
  },
  moreCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: spacing.sm,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  moreImage: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.sm,
    marginRight: spacing.md,
  },
  moreInfo: {
    flex: 1,
  },
  moreTitle: {
    ...typography.subtitle2,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  morePrice: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    gap: spacing.sm,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray100,
  },
  chatButtonText: {
    ...typography.body2,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
  },
  callButtonText: {
    ...typography.body2,
    fontWeight: '700',
    color: colors.primary,
  },
  enquiryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  enquiryButtonText: {
    ...typography.body2,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
