import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';

export function EnquiryModal() {
  const { enquiryModal, closeEnquiryModal, showToast, openConversationWithBusiness } = useApp();
  const [quantity, setQuantity] = useState('10');
  const [phone, setPhone] = useState('+91 98795 23410');
  const [message, setMessage] = useState('');
  const [city, setCity] = useState('Ahmedabad');

  if (!enquiryModal.isOpen) return null;

  const handleSubmit = () => {
    const bizId = enquiryModal.targetBusinessId;
    const bizName = enquiryModal.targetBusinessName || 'Supplier';
    const targetTitle = enquiryModal.targetTitle || 'Business Quotation';

    closeEnquiryModal();

    if (bizId) {
      const summaryMsg = `Quotation Request: ${targetTitle}\n• Required Quantity: ${quantity || '1'}\n• Delivery City: ${city}${phone ? `\n• Phone: ${phone}` : ''}${message ? `\n• Requirements: ${message}` : ''}`;
      openConversationWithBusiness(bizId, {
        initialMessage: summaryMsg,
      });
      showToast(`Enquiry sent directly to ${bizName}!`, 'success');
    } else {
      showToast(`Enquiry submitted to ${bizName}! They will respond shortly.`, 'success');
    }
  };

  return (
    <Modal
      visible={enquiryModal.isOpen}
      transparent
      animationType="fade"
      onRequestClose={closeEnquiryModal}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableWithoutFeedback onPress={closeEnquiryModal}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.dialogContainer}>
          <View style={styles.dialogHeader}>
            <View style={styles.headerTitleContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name="chatbubbles-outline" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.dialogTitle}>Request Quotation</Text>
                <Text style={styles.dialogSubtitle} numberOfLines={1}>
                  {enquiryModal.targetBusinessName || 'Direct Manufacturer Enquiry'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={closeEnquiryModal} style={styles.closeBtn}>
              <Feather name="x" size={20} color="#667085" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {/* Target item indicator */}
            <View style={styles.itemCard}>
              <Text style={styles.itemLabel}>PRODUCT / REQUIREMENT</Text>
              <Text style={styles.itemTitle} numberOfLines={2}>
                {enquiryModal.targetTitle || 'Custom Commercial Requirement'}
              </Text>
            </View>

            {/* Inputs */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Quantity Required</Text>
              <TextInput
                style={styles.textInput}
                value={quantity}
                onChangeText={setQuantity}
                placeholder="e.g. 25 Units"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Delivery Location / City</Text>
              <TextInput
                style={styles.textInput}
                value={city}
                onChangeText={setCity}
                placeholder="e.g. Surat or GIDC Vatva"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contact Phone Number</Text>
              <TextInput
                style={styles.textInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="+91..."
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Detailed Specifications / Notes</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={message}
                onChangeText={setMessage}
                placeholder="Describe your delivery timeline, GST invoice requirement, or custom specs..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.privacyNote}>
              <Ionicons name="shield-checkmark" size={14} color="#10B981" />
              <Text style={styles.privacyText}>
                Your contact details are shared strictly with verified sellers on Supporters.
              </Text>
            </View>
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.dialogActions}>
            <TouchableOpacity
              onPress={closeEnquiryModal}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSubmit}
              style={styles.submitBtn}
              activeOpacity={0.85}
            >
              <Feather name="send" size={14} color="#FFFFFF" />
              <Text style={styles.submitText}>Send Quotation Enquiry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  dialogContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    maxHeight: '85%',
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  dialogSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  closeBtn: {
    padding: 4,
  },
  formScroll: {
    padding: 16,
  },
  itemCard: {
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  itemLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: colors.textPrimary,
  },
  textArea: {
    height: 72,
    textAlignVertical: 'top',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  privacyText: {
    fontSize: 10,
    color: '#065F46',
    flex: 1,
  },
  dialogActions: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  submitBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  submitText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
