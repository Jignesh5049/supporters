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
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';
import {
  ServiceBottomBar,
  ServiceVendorCard,
  ServiceMediaGallery,
} from '../features/catalog/components';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function ServiceDetailScreen() {
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
                url: `https://supporters.in/service/${service.id}`,
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
        <ServiceMediaGallery
          images={service.images}
          selectedIndex={selectedImgIdx}
          onSelectIndex={setSelectedImgIdx}
        />

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
            <Text style={styles.priceHighlight}>
              From ₹{service.startingPrice.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.priceUnit}>{service.priceUnit}</Text>
          </View>

          {/* Highlights */}
          {service.features && service.features.length > 0 && (
            <View style={styles.featuresCard}>
              <Text style={styles.sectionHeader}>Service Highlights</Text>
              {service.features.map((feat, idx) => (
                <View key={idx} style={styles.featureItem}>
                  <CheckCircle2 size={16} color="#16A34A" style={{ marginRight: 8 }} />
                  <Text style={styles.featureText}>{feat}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>About This Service</Text>
            <Text style={styles.descriptionText}>{service.description}</Text>
          </View>

          {/* Business Card */}
          <ServiceVendorCard
            business={business}
            onPress={() => router.push(`/business/${business.id}` as any)}
          />

          {/* More Services */}
          {moreServices.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>More from {business.name}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {moreServices.map((ms) => (
                  <TouchableOpacity
                    key={ms.id}
                    style={styles.moreCard}
                    onPress={() => router.push(`/service/${ms.id}` as any)}
                  >
                    <Image source={{ uri: ms.images[0] }} style={styles.moreImage} />
                    <Text style={styles.moreTitle} numberOfLines={1}>
                      {ms.title}
                    </Text>
                    <Text style={styles.morePrice}>
                      From ₹{ms.startingPrice.toLocaleString('en-IN')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Bottom Bar */}
      <ServiceBottomBar
        onCall={business.phone ? handleCall : undefined}
        onChat={() =>
          openConversationWithBusiness(service.businessId, {
            initialMessage: `Namaste! I am interested in your service "${service.title}". Please share availability and quotation details.`,
            attachedService: service,
          })
        }
        onEnquire={() =>
          openEnquiryModal({
            title: service.title,
            businessName: service.businessName,
            businessId: service.businessId,
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    position: 'absolute',
    top: 44,
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  topBarActions: {
    flexDirection: 'row',
    gap: 8,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  body: {
    padding: 16,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  availabilityText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 26,
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 16,
  },
  priceHighlight: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
  },
  priceUnit: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  featuresCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  featureText: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  moreCard: {
    width: 140,
    marginRight: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 8,
  },
  moreImage: {
    width: '100%',
    height: 90,
    borderRadius: 6,
    marginBottom: 6,
    backgroundColor: '#F3F4F6',
  },
  moreTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  morePrice: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 2,
  },
});
