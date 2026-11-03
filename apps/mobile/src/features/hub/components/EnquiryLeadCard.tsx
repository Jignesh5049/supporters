import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Phone, MessageSquare, CheckCircle, Clock, User } from 'lucide-react-native';
import { colors } from '../../../styles/theme';

export interface EnquiryLead {
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

export interface EnquiryLeadCardProps {
  enquiry: EnquiryLead;
  onCall: (phone: string) => void;
  onWhatsApp: (phone: string, title: string) => void;
  onToggleStatus: (id: string) => void;
}

export function EnquiryLeadCard({
  enquiry,
  onCall,
  onWhatsApp,
  onToggleStatus,
}: EnquiryLeadCardProps) {
  const isNew = enquiry.status === 'new';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.customerInfo}>
          <View style={styles.avatar}>
            <User size={18} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.customerName}>{enquiry.customerName}</Text>
            <Text style={styles.timeAgo}>{enquiry.timeAgo}</Text>
          </View>
        </View>

        <View style={[styles.statusBadge, isNew ? styles.statusNew : styles.statusContacted]}>
          <Clock size={11} color={isNew ? '#2563EB' : '#16A34A'} style={{ marginRight: 3 }} />
          <Text style={[styles.statusText, { color: isNew ? '#2563EB' : '#16A34A' }]}>
            {enquiry.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.leadBody}>
        <Text style={styles.itemTitle}>{enquiry.productOrServiceTitle}</Text>
        {enquiry.quantity ? (
          <Text style={styles.quantityText}>Required: {enquiry.quantity}</Text>
        ) : null}
        <Text style={styles.messageText}>"{enquiry.message}"</Text>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onCall(enquiry.customerPhone)}>
          <Phone size={14} color={colors.primary} />
          <Text style={styles.actionBtnText}>Call</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onWhatsApp(enquiry.customerPhone, enquiry.productOrServiceTitle)}
        >
          <MessageSquare size={14} color="#16A34A" />
          <Text style={[styles.actionBtnText, { color: '#16A34A' }]}>WhatsApp</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statusBtn, !isNew && styles.statusBtnContacted]}
          onPress={() => onToggleStatus(enquiry.id)}
        >
          <CheckCircle size={14} color={isNew ? '#4B5563' : '#16A34A'} />
          <Text style={styles.statusBtnText}>{isNew ? 'Mark Contacted' : 'Contacted'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  timeAgo: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusNew: {
    backgroundColor: '#EFF6FF',
  },
  statusContacted: {
    backgroundColor: '#ECFDF5',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  leadBody: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  quantityText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  statusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusBtnContacted: {
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
  },
  statusBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
