import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ShieldCheck,
  Upload,
  FileCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react-native';
import { useApp } from '../../src/context/AppContext';
import { colors, typography, spacing, borderRadius } from '../../src/styles/theme';

export default function HubVerificationScreen() {
  const router = useRouter();
  const { showToast, currentUser } = useApp();

  const [docType, setDocType] = useState<'GSTIN' | 'Udyam'>('GSTIN');
  const [docNumber, setDocNumber] = useState('');
  const [docUploaded, setDocUploaded] = useState(false);
  const [ownerIdUploaded, setOwnerIdUploaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'not_submitted' | 'under_review'>(
    'not_submitted',
  );

  const handleSubmit = () => {
    if (!docNumber.trim()) {
      showToast(`Please enter your valid ${docType} number`, 'error');
      return;
    }
    if (!docUploaded) {
      showToast('Please upload your business registration certificate', 'error');
      return;
    }
    if (!ownerIdUploaded) {
      showToast('Please upload the owner/director ID document', 'error');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setVerificationStatus('under_review');
      showToast('Verification documents submitted for review!', 'success');
    }, 800);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Business Verification</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Verification Status Banner */}
        {verificationStatus === 'under_review' ? (
          <View style={styles.statusReviewBanner}>
            <AlertCircle size={24} color={colors.primary} style={{ marginBottom: spacing.xs }} />
            <Text style={styles.statusReviewTitle}>Documents Under Review</Text>
            <Text style={styles.statusReviewText}>
              Our compliance team is verifying your {docType} certificate and credentials. The
              Verified badge will appear on your profile within 24 to 48 hours.
            </Text>
          </View>
        ) : (
          <View style={styles.perksBanner}>
            <ShieldCheck size={32} color={colors.primary} style={{ marginBottom: spacing.xs }} />
            <Text style={styles.perksTitle}>Get the Verified Supplier Badge</Text>
            <Text style={styles.perksSubtitle}>
              Verification is completely free and separates legitimate registered manufacturers and
              traders from unverified accounts.
            </Text>

            <View style={styles.perkList}>
              <View style={styles.perkItem}>
                <CheckCircle2 size={16} color={colors.success} style={{ marginRight: 6 }} />
                <Text style={styles.perkText}>Prominent Green Shield on all products & posts</Text>
              </View>
              <View style={styles.perkItem}>
                <CheckCircle2 size={16} color={colors.success} style={{ marginRight: 6 }} />
                <Text style={styles.perkText}>Higher search ranking in local discovery</Text>
              </View>
              <View style={styles.perkItem}>
                <CheckCircle2 size={16} color={colors.success} style={{ marginRight: 6 }} />
                <Text style={styles.perkText}>
                  Build instant trust with institutional and B2B buyers
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Verification Form */}
        {verificationStatus === 'not_submitted' && (
          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>1. Business Registration</Text>

            <View style={styles.docTypeSelector}>
              {(['GSTIN', 'Udyam'] as const).map((type) => {
                const isSelected = docType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.docTypeButton, isSelected && styles.docTypeButtonActive]}
                    onPress={() => setDocType(type)}
                  >
                    <Text style={[styles.docTypeText, isSelected && styles.docTypeTextActive]}>
                      {type} Certificate
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{docType} Registration Number *</Text>
              <TextInput
                style={styles.input}
                placeholder={
                  docType === 'GSTIN' ? 'e.g. 24AAAAA0000A1Z5' : 'e.g. UDYAM-GJ-01-0000000'
                }
                placeholderTextColor={colors.gray400}
                autoCapitalize="characters"
                value={docNumber}
                onChangeText={setDocNumber}
              />
            </View>

            {/* Document Upload */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Upload {docType} PDF / Certificate Copy *</Text>
              <TouchableOpacity
                style={[styles.uploadBox, docUploaded && styles.uploadBoxDone]}
                onPress={() => {
                  setDocUploaded(true);
                  showToast('Document attached', 'success');
                }}
              >
                {docUploaded ? (
                  <View style={styles.uploadInner}>
                    <FileCheck size={24} color={colors.success} style={{ marginBottom: 4 }} />
                    <Text style={styles.uploadTextDone}>Certificate Attached (1.2 MB)</Text>
                    <Text style={styles.uploadSubDone}>Tap to replace file</Text>
                  </View>
                ) : (
                  <View style={styles.uploadInner}>
                    <Upload size={24} color={colors.gray400} style={{ marginBottom: 4 }} />
                    <Text style={styles.uploadText}>Select PDF or Image from device</Text>
                    <Text style={styles.uploadSub}>Max size: 10 MB</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <Text style={[styles.formSectionTitle, { marginTop: spacing.xl }]}>
              2. Authorized Signatory / Owner ID
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Owner PAN / Aadhaar Card Photo *</Text>
              <TouchableOpacity
                style={[styles.uploadBox, ownerIdUploaded && styles.uploadBoxDone]}
                onPress={() => {
                  setOwnerIdUploaded(true);
                  showToast('Identity document attached', 'success');
                }}
              >
                {ownerIdUploaded ? (
                  <View style={styles.uploadInner}>
                    <FileCheck size={24} color={colors.success} style={{ marginBottom: 4 }} />
                    <Text style={styles.uploadTextDone}>Owner ID Attached</Text>
                    <Text style={styles.uploadSubDone}>Tap to replace file</Text>
                  </View>
                ) : (
                  <View style={styles.uploadInner}>
                    <Upload size={24} color={colors.gray400} style={{ marginBottom: 4 }} />
                    <Text style={styles.uploadText}>Upload Clear Photo of Owner ID</Text>
                    <Text style={styles.uploadSub}>JPEG, PNG or PDF (Max 10 MB)</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && { opacity: 0.5 }]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Submit for Verification</Text>
              )}
            </TouchableOpacity>
          </View>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.subtitle1,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 60,
  },
  perksBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray200,
    marginBottom: spacing.lg,
  },
  perksTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: 4,
    marginBottom: 4,
    textAlign: 'center',
  },
  perksSubtitle: {
    ...typography.body2,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  perkList: {
    width: '100%',
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    paddingTop: spacing.md,
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  perkText: {
    ...typography.body2,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  statusReviewBanner: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  statusReviewTitle: {
    ...typography.h3,
    color: colors.primaryDark,
    marginBottom: spacing.xs,
  },
  statusReviewText: {
    ...typography.body2,
    color: colors.primaryDark,
    textAlign: 'center',
    lineHeight: 20,
  },
  formSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  formSectionTitle: {
    ...typography.subtitle1,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  docTypeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  docTypeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray100,
    alignItems: 'center',
  },
  docTypeButtonActive: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  docTypeText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  docTypeTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  input: {
    height: 48,
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray300,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    color: colors.textPrimary,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.gray300,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray50,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBoxDone: {
    borderColor: colors.success,
    backgroundColor: '#F0FDF4',
    borderStyle: 'solid',
  },
  uploadInner: {
    alignItems: 'center',
  },
  uploadText: {
    ...typography.body2,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  uploadSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  uploadTextDone: {
    ...typography.body2,
    fontWeight: '700',
    color: colors.success,
  },
  uploadSubDone: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  submitButton: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
