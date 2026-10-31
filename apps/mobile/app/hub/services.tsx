import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Wrench, Trash2, Clock, X } from 'lucide-react-native';
import { useApp } from '../../src/context/AppContext';
import { Service } from '../../mock';
import { colors, typography, spacing, borderRadius } from '../../src/styles/theme';

export default function HubServicesScreen() {
  const router = useRouter();
  const { services, currentUser, showToast } = useApp();

  const myBusinessId = currentUser?.businessId || 'b-1';
  const [serviceList, setServiceList] = useState<Service[]>(
    services.filter((s) => s.businessId === myBusinessId),
  );

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Professional Services');
  const [startingPrice, setStartingPrice] = useState('');
  const [priceUnit, setPriceUnit] = useState('per project');
  const [serviceArea, setServiceArea] = useState('Pan India');
  const [availability, setAvailability] = useState<
    'Immediate' | 'Within 24 Hours' | 'By Appointment'
  >('Immediate');
  const [description, setDescription] = useState('');

  const handleAddService = () => {
    if (!title.trim() || !startingPrice.trim()) {
      showToast('Title and starting price are required', 'error');
      return;
    }

    const newService: Service = {
      id: `s-${Date.now()}`,
      businessId: myBusinessId,
      businessName: currentUser.name || 'My Business',
      businessCity: currentUser.city || 'Ahmedabad',
      businessVerified: true,
      businessAvatar:
        currentUser.avatar ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      title: title.trim(),
      slug: title.trim().toLowerCase().replace(/\s+/g, '-'),
      category,
      startingPrice: parseFloat(startingPrice) || 0,
      priceUnit,
      serviceArea,
      availability,
      rating: 5.0,
      reviewCount: 0,
      features: ['Dedicated project manager', 'Complete testing', 'Post-delivery support'],
      turnaroundTime: '3-5 days',
      images: [
        'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80',
      ],
      description: description.trim() || 'Professional business service.',
    };

    setServiceList((prev) => [newService, ...prev]);
    setAddModalOpen(false);
    setTitle('');
    setStartingPrice('');
    setDescription('');
    showToast('Service added to your catalog!', 'success');
  };

  const handleDeleteService = (id: string) => {
    Alert.alert('Delete Service', 'Are you sure you want to delete this service?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setServiceList((prev) => prev.filter((s) => s.id !== id));
          showToast('Service deleted', 'info');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Services Catalog</Text>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={() => setAddModalOpen(true)}>
          <Plus size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.addButtonText}>Add Service</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtext}>
          Manage service offerings, hourly rates, and deliverables ({serviceList.length})
        </Text>

        {serviceList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Wrench size={48} color={colors.gray300} style={{ marginBottom: spacing.md }} />
            <Text style={styles.emptyTitle}>No services listed yet</Text>
            <Text style={styles.emptySub}>
              Offer consulting, fabrication, maintenance, logistics, or digital services.
            </Text>
          </View>
        ) : (
          serviceList.map((srv) => (
            <View key={srv.id} style={styles.card}>
              <Image source={{ uri: srv.images[0] }} style={styles.serviceImg} />
              <View style={styles.cardInfo}>
                <Text style={styles.serviceTitle} numberOfLines={2}>
                  {srv.title}
                </Text>

                <Text style={styles.priceText}>
                  From ₹{srv.startingPrice.toLocaleString('en-IN')}{' '}
                  <Text style={styles.unitText}>{srv.priceUnit}</Text>
                </Text>

                <View style={styles.badgeRow}>
                  <View style={styles.badge}>
                    <Clock size={11} color={colors.primary} style={{ marginRight: 3 }} />
                    <Text style={styles.badgeText}>{srv.availability}</Text>
                  </View>
                  <Text style={styles.areaText}>{srv.serviceArea}</Text>
                </View>

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleDeleteService(srv.id)}
                  >
                    <Trash2 size={16} color={colors.error} />
                    <Text style={[styles.actionBtnText, { color: colors.error }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Service Modal */}
      <Modal visible={addModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Service</Text>
              <TouchableOpacity onPress={() => setAddModalOpen(false)}>
                <X size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Service Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Turnkey Industrial Automation Consultation"
                  placeholderTextColor={colors.gray400}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
                  <Text style={styles.label}>Starting Price (INR) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 25000"
                    placeholderTextColor={colors.gray400}
                    keyboardType="numeric"
                    value={startingPrice}
                    onChangeText={setStartingPrice}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: spacing.sm }]}>
                  <Text style={styles.label}>Price Unit</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="per project / per hour"
                    placeholderTextColor={colors.gray400}
                    value={priceUnit}
                    onChangeText={setPriceUnit}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
                  <Text style={styles.label}>Service Area</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Pan India / City"
                    placeholderTextColor={colors.gray400}
                    value={serviceArea}
                    onChangeText={setServiceArea}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: spacing.sm }]}>
                  <Text style={styles.label}>Category</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Category"
                    placeholderTextColor={colors.gray400}
                    value={category}
                    onChangeText={setCategory}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Service Description</Text>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="Explain the scope of work, timeline, and deliverables..."
                  placeholderTextColor={colors.gray400}
                  multiline
                  numberOfLines={3}
                  value={description}
                  onChangeText={setDescription}
                />
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleAddService}>
                <Text style={styles.submitBtnText}>Save Service</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerTitle: {
    ...typography.subtitle1,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    height: 38,
    borderRadius: borderRadius.full,
  },
  addButtonText: {
    ...typography.caption,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 60,
  },
  subtext: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.subtitle1,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptySub: {
    ...typography.body2,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  serviceImg: {
    width: 90,
    height: 90,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
    backgroundColor: colors.gray100,
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  serviceTitle: {
    ...typography.subtitle2,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 2,
  },
  unitText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  areaText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    paddingTop: 6,
    marginTop: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  input: {
    height: 46,
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray300,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    color: colors.textPrimary,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
