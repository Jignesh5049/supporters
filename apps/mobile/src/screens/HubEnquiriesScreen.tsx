import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Inbox } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';
import { EnquiryLeadCard, EnquiryLead } from '../features/hub/components/EnquiryLeadCard';

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

export function HubEnquiriesScreen() {
  const router = useRouter();
  const { showToast } = useApp();

  const [enquiries, setEnquiries] = useState<EnquiryLead[]>(SAMPLE_ENQUIRIES);
  const [filter, setFilter] = useState<'all' | 'new' | 'contacted'>('all');

  const filtered = filter === 'all' ? enquiries : enquiries.filter((e) => e.status === filter);

  const handleToggleStatus = (id: string) => {
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
          <Text style={styles.headerTitle}>Buyer Enquiries ({enquiries.length})</Text>
        </View>

        {/* Status Filters */}
        <View style={styles.tabsRow}>
          {(['all', 'new', 'contacted'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, filter === tab && styles.tabBtnActive]}
              onPress={() => setFilter(tab)}
            >
              <Text style={[styles.tabText, filter === tab && styles.tabTextActive]}>
                {tab.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Inbox size={40} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No buyer enquiries</Text>
            <Text style={styles.emptySub}>
              Enquiries received for your products and services will appear here in real-time.
            </Text>
          </View>
        ) : (
          filtered.map((enq) => (
            <EnquiryLeadCard
              key={enq.id}
              enquiry={enq}
              onCall={handleCall}
              onWhatsApp={handleWhatsApp}
              onToggleStatus={handleToggleStatus}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
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
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  content: {
    padding: 14,
    paddingBottom: 30,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
});
