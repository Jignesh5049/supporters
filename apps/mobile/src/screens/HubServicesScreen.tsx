import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Wrench, Trash2 } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { Service } from '../../mock';
import { colors } from '../styles/theme';
import { AddServiceModal } from '../features/hub/components/AddServiceModal';

export function HubServicesScreen() {
  const router = useRouter();
  const { services, currentUser, showToast } = useApp();

  const myBusinessId = currentUser?.businessId || 'b-1';
  const [serviceList, setServiceList] = useState<Service[]>(
    services.filter((s) => s.businessId === myBusinessId),
  );
  const [addModalOpen, setAddModalOpen] = useState(false);

  const handleAddService = (data: {
    title: string;
    startingPrice: string;
    priceUnit: string;
    category: string;
    description: string;
  }) => {
    const newSvc: Service = {
      id: `s-${Date.now()}`,
      businessId: myBusinessId,
      businessName: currentUser.name || 'My Business',
      businessCity: currentUser.city || 'Ahmedabad',
      businessVerified: true,
      businessAvatar:
        currentUser.avatar ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      title: data.title,
      slug: data.title.toLowerCase().replace(/\s+/g, '-'),
      category: data.category,
      startingPrice: parseFloat(data.startingPrice) || 0,
      priceUnit: data.priceUnit,
      images: [
        'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
      ],
      description: data.description || 'Specialized B2B industrial service.',
      features: ['Precision Machining', 'ISO Compliant', 'Turnaround in 48h'],
      availability: 'By Appointment',
      serviceArea: 'Gujarat, Maharashtra',
      turnaroundTime: '2-4 business days',
      rating: 5.0,
      reviewCount: 0,
    };

    setServiceList((prev) => [newSvc, ...prev]);
    showToast('Service listed on your storefront!', 'success');
  };

  const handleDeleteService = (id: string) => {
    Alert.alert(
      'Remove Service',
      'Are you sure you want to remove this service listing from your profile?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setServiceList((prev) => prev.filter((s) => s.id !== id));
            showToast('Service listing deleted', 'info');
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Services ({serviceList.length})</Text>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={() => setAddModalOpen(true)}>
          <Plus size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.addButtonText}>Add Service</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtext}>
          List B2B industrial, design, engineering, or logistics services offered by your
          enterprise.
        </Text>

        {serviceList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Wrench size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No services listed</Text>
            <Text style={styles.emptySubtitle}>
              Offer contract manufacturing, fabrication, or professional trade services to buyers.
            </Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setAddModalOpen(true)}>
              <Text style={styles.emptyAddBtnText}>Add Your First Service</Text>
            </TouchableOpacity>
          </View>
        ) : (
          serviceList.map((s) => (
            <View key={s.id} style={styles.serviceCard}>
              <Image source={{ uri: s.images[0] }} style={styles.serviceImage} />
              <View style={styles.serviceDetails}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{s.category}</Text>
                </View>
                <Text style={styles.serviceTitle} numberOfLines={1}>
                  {s.title}
                </Text>
                <Text style={styles.servicePrice}>
                  From ₹{s.startingPrice.toLocaleString('en-IN')} {s.priceUnit}
                </Text>

                <View style={styles.actionRow}>
                  <Text style={styles.availabilityText}>{s.availability}</Text>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteService(s.id)}
                  >
                    <Trash2 size={15} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <AddServiceModal
        visible={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSubmit={handleAddService}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 6,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
  },
  subtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  emptyAddBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  serviceCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  serviceImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  serviceDetails: {
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  serviceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  servicePrice: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  availabilityText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  deleteBtn: {
    padding: 6,
  },
});
