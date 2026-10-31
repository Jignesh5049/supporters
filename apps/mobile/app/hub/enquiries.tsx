import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Mail,
  Phone,
  MessageSquare,
  CheckCircle,
  Clock,
  Send,
  User,
} from 'lucide-react-native';
import { useApp } from '../../src/context/AppContext';
import { colors, typography, spacing, borderRadius } from '../../src/styles/theme';

interface EnquiryLead {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  productOrServiceTitle: string;
  message: string;
  quantity?: string;
  status: 'new' | 'contacted' | 'closed';
  timeAgo: string;
}

const SAMPLE_ENQUIRIES: EnquiryLead[] = [
  {
    id: 'enq-1',
    customerName: 'Rohit Kulkarni',
    customerPhone: '+91 98200 12345',
    customerEmail: 'rohit.k@apexeng.in',
    productOrServiceTitle: 'SS304 Industrial Ball Valves (2 Inch)',
    quantity: '250 units',
    message: 'Please send test certificates and bulk commercial quote with delivery to Pune MIDC.',
    status: 'new',
    timeAgo: '15 mins ago',
  },
  {
    id: 'enq-2',
    customerName: 'Anil Singhania',
    customerPhone: '+91 97110 54321',
    customerEmail: 'anil@singhaniatex.com',
    productOrServiceTitle: 'Custom ERP & Inventory Sync for Manufacturing',
    quantity: '1 Unit / Site',
    message: 'Can your team integrate with existing Tally Prime database? Need immediate demo.',
    status: 'new',
    timeAgo: '2 hours ago',
  },
  {
    id: 'enq-3',
    customerName: 'Bhavin Mehta',
    customerPhone: '+91 99090 87654',
    customerEmail: 'bhavin.m@shreekrishnatraders.com',
    productOrServiceTitle: 'Printed Corrugated Shipping Boxes (3-Ply)',
    quantity: '5,000 units',
    message: 'Need sample dispatch to Surat address before approving purchase order.',
    status: 'contacted',
    timeAgo: '1 day ago',
  },
];

export default function HubEnquiriesScreen() {
  const router = useRouter();
  const { showToast } = useApp();

  const [enquiries, setEnquiries] = useState<EnquiryLead[]>(SAMPLE_ENQUIRIES);
  const [filter, setFilter] = useState<'all' | 'new' | 'contacted'>('all');

  const filtered = filter === 'all' ? enquiries : enquiries.filter((e) => e.status === filter);

  const handleMarkContacted = (id: string) => {
    setEnquiries((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, status: e.status === 'new' ? 'contacted' : 'closed' } : e,
      ),
    );
    showToast('Enquiry status updated', 'success');
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleWhatsApp = (phone: string, title: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `Hello, thank you for your enquiry on Supporters regarding "${title}". How can we assist you?`,
    );
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${text}`);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Enquiry Leads</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        {(['all', 'new', 'contacted'] as const).map((tab) => {
          const isActive = filter === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.filterTab, isActive && styles.filterTabActive]}
              onPress={() => setFilter(tab)}
            >
              <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                {tab === 'all'
                  ? `All (${enquiries.length})`
                  : tab === 'new'
                    ? `New (${enquiries.filter((e) => e.status === 'new').length})`
                    : 'Contacted'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Mail size={44} color={colors.gray300} style={{ marginBottom: spacing.md }} />
            <Text style={styles.emptyTitle}>No enquiries found</Text>
            <Text style={styles.emptySub}>
              Customer enquiries from your listings will appear here in real-time.
            </Text>
          </View>
        ) : (
          filtered.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.customerRow}>
                  <View style={styles.avatar}>
                    <User size={18} color={colors.primary} />
                  </View>
                  <View style={styles.customerMeta}>
                    <Text style={styles.customerName}>{item.customerName}</Text>
                    <Text style={styles.timeAgo}>{item.timeAgo}</Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    item.status === 'new' ? styles.statusNew : styles.statusContacted,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      item.status === 'new' ? styles.statusTextNew : styles.statusTextContacted,
                    ]}
                  >
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.itemTargetRow}>
                <Text style={styles.itemTargetLabel}>Inquiry for:</Text>
                <Text style={styles.itemTargetTitle} numberOfLines={1}>
                  {item.productOrServiceTitle}
                </Text>
              </View>

              {item.quantity && (
                <View style={styles.quantityRow}>
                  <Text style={styles.quantityText}>
                    Required Quantity: <Text style={styles.bold}>{item.quantity}</Text>
                  </Text>
                </View>
              )}

              <Text style={styles.messageText}>"{item.message}"</Text>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() => handleCall(item.customerPhone)}
                >
                  <Phone size={15} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.callBtnText}>Call</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.waBtn}
                  onPress={() => handleWhatsApp(item.customerPhone, item.productOrServiceTitle)}
                >
                  <Send size={15} color="#25D366" style={{ marginRight: 4 }} />
                  <Text style={styles.waBtnText}>WhatsApp</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.statusBtn}
                  onPress={() => handleMarkContacted(item.id)}
                >
                  <CheckCircle size={15} color={colors.textSecondary} style={{ marginRight: 4 }} />
                  <Text style={styles.statusBtnText}>
                    {item.status === 'new' ? 'Mark Contacted' : 'Close Lead'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
  filterBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabActive: {
    borderBottomColor: colors.primary,
  },
  filterTabText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 60,
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
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  customerMeta: {
    justifyContent: 'center',
  },
  customerName: {
    ...typography.subtitle2,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  timeAgo: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusNew: {
    backgroundColor: '#DCFCE7',
  },
  statusContacted: {
    backgroundColor: colors.gray100,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusTextNew: {
    color: colors.success,
  },
  statusTextContacted: {
    color: colors.textSecondary,
  },
  itemTargetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  itemTargetLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginRight: 4,
  },
  itemTargetTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    flex: 1,
  },
  quantityRow: {
    marginTop: 2,
  },
  quantityText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  bold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  messageText: {
    ...typography.body2,
    color: colors.textPrimary,
    backgroundColor: colors.gray50,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    fontStyle: 'italic',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    height: 36,
    borderRadius: borderRadius.sm,
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  waBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8FBF0',
    paddingHorizontal: spacing.md,
    height: 36,
    borderRadius: borderRadius.sm,
  },
  waBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  statusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray100,
    height: 36,
    borderRadius: borderRadius.sm,
  },
  statusBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
